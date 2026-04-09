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

      // Broadcast presence
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

    // Send to both sender and receiver
    const dmRoom = [connUser.userId, data.toUserId].sort().join(':');
    this.server.to(`dm:${dmRoom}`).emit('message:new', { message });
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
