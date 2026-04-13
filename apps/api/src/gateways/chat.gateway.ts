import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ChannelsService } from '../channels/channels.service';

interface ConnectedUser {
  userId: string;
  userName: string;
  socketId: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:7001',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private connectedUsers: Map<string, ConnectedUser> = new Map();

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private channelsService: ChannelsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string;
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwt.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, name: true },
      });
      if (!user) {
        client.disconnect();
        return;
      }

      this.connectedUsers.set(client.id, {
        userId: user.id,
        userName: user.name,
        socketId: client.id,
      });

      this.server.emit('presence:update', {
        userId: user.id,
        online: true,
      });
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = this.connectedUsers.get(client.id);
    if (user) {
      this.connectedUsers.delete(client.id);
      this.server.emit('presence:update', {
        userId: user.userId,
        online: false,
      });
    }
  }

  @SubscribeMessage('join:channel')
  handleJoinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    client.join(`channel:${data.channelId}`);
  }

  @SubscribeMessage('leave:channel')
  handleLeaveChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    client.leave(`channel:${data.channelId}`);
  }

  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { content: string; channelId: string },
  ) {
    const connUser = this.connectedUsers.get(client.id);
    if (!connUser) return;

    const message = await this.prisma.message.create({
      data: {
        content: data.content,
        channelId: data.channelId,
        authorId: connUser.userId,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
    });

    this.server.to(`channel:${data.channelId}`).emit('message:new', { message });
  }

  @SubscribeMessage('message:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const connUser = this.connectedUsers.get(client.id);
    if (!connUser) return;

    client.to(`channel:${data.channelId}`).emit('message:typing', {
      channelId: data.channelId,
      userId: connUser.userId,
      userName: connUser.userName,
    });
  }

  // ── DM ──

  @SubscribeMessage('message:dm')
  async handleDM(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { content: string; toUserId: string },
  ) {
    const connUser = this.connectedUsers.get(client.id);
    if (!connUser) return;

    const message = await this.prisma.message.create({
      data: {
        content: data.content,
        authorId: connUser.userId,
        dmTo: data.toUserId,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
    });

    const dmRoom = [connUser.userId, data.toUserId].sort().join(':');
    this.server.to(`dm:${dmRoom}`).emit('message:new', { message });

    // Also notify the recipient globally for unread badge
    this.emitToUser(data.toUserId, 'dm:new', { message });
  }

  @SubscribeMessage('join:dm')
  handleJoinDM(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { otherUserId: string },
  ) {
    const connUser = this.connectedUsers.get(client.id);
    if (!connUser) return;
    const dmRoom = [connUser.userId, data.otherUserId].sort().join(':');
    client.join(`dm:${dmRoom}`);
  }

  // ── Read receipts ──

  @SubscribeMessage('message:mark-read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageIds: string[]; channelId?: string; dmUserId?: string },
  ) {
    const connUser = this.connectedUsers.get(client.id);
    if (!connUser) return;

    const updatedIds = await this.channelsService.markMessagesAsRead(connUser.userId, data.messageIds);

    if (updatedIds.length > 0) {
      const payload = { messageIds: updatedIds, userId: connUser.userId };
      if (data.channelId) {
        this.server.to(`channel:${data.channelId}`).emit('message:read', payload);
      } else if (data.dmUserId) {
        const dmRoom = [connUser.userId, data.dmUserId].sort().join(':');
        this.server.to(`dm:${dmRoom}`).emit('message:read', payload);
      }
    }
  }

  // ── Threads ──

  @SubscribeMessage('message:reply')
  async handleReply(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { parentId: string; content: string; channelId?: string; dmUserId?: string },
  ) {
    const connUser = this.connectedUsers.get(client.id);
    if (!connUser) return;

    const { reply, replyCount } = await this.channelsService.sendReply(data.parentId, data.content, connUser.userId);

    const replyPayload = { message: reply, parentId: data.parentId };
    const threadPayload = { parentId: data.parentId, replyCount };

    if (data.channelId) {
      this.server.to(`channel:${data.channelId}`).emit('message:reply:new', replyPayload);
      this.server.to(`channel:${data.channelId}`).emit('thread:updated', threadPayload);
    } else if (data.dmUserId) {
      const dmRoom = [connUser.userId, data.dmUserId].sort().join(':');
      this.server.to(`dm:${dmRoom}`).emit('message:reply:new', replyPayload);
      this.server.to(`dm:${dmRoom}`).emit('thread:updated', threadPayload);
    }
  }

  @SubscribeMessage('message:dm:typing')
  handleDMTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { toUserId: string },
  ) {
    const connUser = this.connectedUsers.get(client.id);
    if (!connUser) return;
    const dmRoom = [connUser.userId, data.toUserId].sort().join(':');
    client.to(`dm:${dmRoom}`).emit('message:dm:typing', {
      userId: connUser.userId,
      userName: connUser.userName,
    });
  }

  // ── Reactions ──

  @SubscribeMessage('message:react')
  async handleReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; emoji: string; channelId?: string; dmUserId?: string },
  ) {
    const connUser = this.connectedUsers.get(client.id);
    if (!connUser) return;

    const updated = await this.channelsService.toggleReaction(data.messageId, connUser.userId, data.emoji);

    const payload = { messageId: data.messageId, reactions: updated.reactions };

    if (data.channelId) {
      this.server.to(`channel:${data.channelId}`).emit('message:reacted', payload);
    } else if (data.dmUserId) {
      const dmRoom = [connUser.userId, data.dmUserId].sort().join(':');
      this.server.to(`dm:${dmRoom}`).emit('message:reacted', payload);
    }
  }

  // ── Deletion ──

  @SubscribeMessage('message:delete')
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; channelId?: string; dmUserId?: string },
  ) {
    const connUser = this.connectedUsers.get(client.id);
    if (!connUser) return;

    await this.channelsService.deleteMessage(data.messageId, connUser.userId);

    const payload = { messageId: data.messageId };

    if (data.channelId) {
      this.server.to(`channel:${data.channelId}`).emit('message:deleted', payload);
    } else if (data.dmUserId) {
      const dmRoom = [connUser.userId, data.dmUserId].sort().join(':');
      this.server.to(`dm:${dmRoom}`).emit('message:deleted', payload);
    }
  }

  // ── Presence ──

  @SubscribeMessage('presence:get')
  handleGetPresence(@ConnectedSocket() client: Socket) {
    const onlineUserIds = Array.from(this.connectedUsers.values()).map(
      (u) => u.userId,
    );
    client.emit('presence:list', { onlineUserIds });
  }

  // Public method — called from services to push notifications
  emitToUser(userId: string, event: string, data: unknown) {
    for (const [socketId, user] of this.connectedUsers.entries()) {
      if (user.userId === userId) {
        this.server.to(socketId).emit(event, data);
      }
    }
  }
}
