import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { SendMessageDto } from './dto/send-message.dto';

interface Reaction {
  emoji: string;
  userIds: string[];
}

@Injectable()
export class ChannelsService {
  constructor(private prisma: PrismaService) {}

  async create(workspaceId: string, dto: CreateChannelDto) {
    return this.prisma.channel.create({
      data: {
        name: dto.name,
        isPrivate: dto.isPrivate || false,
        workspaceId,
      },
    });
  }

  async findByWorkspace(workspaceId: string) {
    return this.prisma.channel.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
    });
  }

  async getMessages(channelId: string, cursor?: string, limit = 50) {
    const messages = await this.prisma.message.findMany({
      where: { channelId, parentId: null },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        _count: { select: { replies: true } },
      },
    });
    return messages.reverse();
  }

  async sendMessage(channelId: string, dto: SendMessageDto, authorId: string) {
    const channel = await this.prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) throw new NotFoundException('Channel non trouvé');

    return this.prisma.message.create({
      data: {
        content: dto.content,
        channelId,
        authorId,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  async sendDM(fromId: string, toId: string, content: string) {
    return this.prisma.message.create({
      data: {
        content,
        authorId: fromId,
        dmTo: toId,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  async getDMs(userId: string, otherUserId: string, cursor?: string, limit = 50) {
    const messages = await this.prisma.message.findMany({
      where: {
        channelId: null,
        parentId: null,
        OR: [
          { authorId: userId, dmTo: otherUserId },
          { authorId: otherUserId, dmTo: userId },
        ],
      },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        _count: { select: { replies: true } },
      },
    });
    return messages.reverse();
  }

  // ── Read receipts ──

  async markMessagesAsRead(userId: string, messageIds: string[]) {
    const messages = await this.prisma.message.findMany({
      where: { id: { in: messageIds }, authorId: { not: userId } },
      select: { id: true, readBy: true },
    });

    const updates = [];
    const updatedIds: string[] = [];

    for (const msg of messages) {
      const readBy = (msg.readBy as unknown as string[]) || [];
      if (!readBy.includes(userId)) {
        updates.push(
          this.prisma.message.update({
            where: { id: msg.id },
            data: { readBy: [...readBy, userId] as any },
          }),
        );
        updatedIds.push(msg.id);
      }
    }

    if (updates.length > 0) {
      await this.prisma.$transaction(updates);
    }

    return updatedIds;
  }

  // ── Threads ──

  async getThreadReplies(parentId: string) {
    return this.prisma.message.findMany({
      where: { parentId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  async sendReply(parentId: string, content: string, authorId: string) {
    const parent = await this.prisma.message.findUnique({ where: { id: parentId } });
    if (!parent) throw new NotFoundException('Message parent non trouvé');

    const reply = await this.prisma.message.create({
      data: {
        content,
        authorId,
        parentId,
        channelId: parent.channelId,
        dmTo: parent.dmTo,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
    });

    const replyCount = await this.prisma.message.count({ where: { parentId } });

    return { reply, replyCount };
  }

  // ── File message ──

  async sendMessageWithFile(
    authorId: string,
    content: string,
    channelId: string | null,
    dmTo: string | null,
    file: { fileUrl: string; fileName: string; fileMimeType: string },
  ) {
    return this.prisma.message.create({
      data: {
        content,
        channelId,
        dmTo,
        authorId,
        fileUrl: file.fileUrl,
        fileName: file.fileName,
        fileMimeType: file.fileMimeType,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  // ── Reactions ──

  async toggleReaction(messageId: string, userId: string, emoji: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message non trouvé');

    const reactions: Reaction[] = (message.reactions as unknown as Reaction[]) || [];
    const existing = reactions.find((r) => r.emoji === emoji);

    if (existing) {
      if (existing.userIds.includes(userId)) {
        existing.userIds = existing.userIds.filter((id) => id !== userId);
        if (existing.userIds.length === 0) {
          reactions.splice(reactions.indexOf(existing), 1);
        }
      } else {
        existing.userIds.push(userId);
      }
    } else {
      reactions.push({ emoji, userIds: [userId] });
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: { reactions: reactions as any },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  // ── Deletion ──

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message non trouvé');
    if (message.authorId !== userId) throw new ForbiddenException('Vous ne pouvez supprimer que vos propres messages');

    await this.prisma.message.delete({ where: { id: messageId } });
    return { id: messageId, channelId: message.channelId, dmTo: message.dmTo, authorId: message.authorId };
  }

  // ── DM Conversations ──

  async getDMConversations(userId: string, workspaceId: string) {
    // Get workspace member IDs
    const wsMembers = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { userId: true, user: { select: { id: true, name: true, email: true, avatar: true } } },
    });
    const memberMap = new Map(wsMembers.map((m) => [m.userId, m.user]));

    // Get all DM partners
    const sent = await this.prisma.message.findMany({
      where: { authorId: userId, dmTo: { not: null } },
      select: { dmTo: true },
      distinct: ['dmTo'],
    });
    const received = await this.prisma.message.findMany({
      where: { dmTo: userId },
      select: { authorId: true },
      distinct: ['authorId'],
    });

    const partnerIds = new Set<string>();
    sent.forEach((m) => m.dmTo && partnerIds.add(m.dmTo));
    received.forEach((m) => partnerIds.add(m.authorId));

    // Build conversations
    const conversations = [];
    for (const partnerId of partnerIds) {
      const user = memberMap.get(partnerId);
      if (!user) continue;

      const lastMsg = await this.prisma.message.findFirst({
        where: {
          channelId: null,
          OR: [
            { authorId: userId, dmTo: partnerId },
            { authorId: partnerId, dmTo: userId },
          ],
        },
        orderBy: { createdAt: 'desc' },
        select: { content: true, createdAt: true, authorId: true },
      });

      // Get unread count
      const dmRead = await this.prisma.dMRead.findUnique({
        where: { userId_otherUserId: { userId, otherUserId: partnerId } },
      });

      const unreadCount = await this.prisma.message.count({
        where: {
          authorId: partnerId,
          dmTo: userId,
          channelId: null,
          ...(dmRead ? { createdAt: { gt: dmRead.lastReadAt } } : {}),
        },
      });

      conversations.push({
        user,
        lastMessage: lastMsg ? {
          content: lastMsg.content,
          createdAt: lastMsg.createdAt.toISOString(),
          authorId: lastMsg.authorId,
        } : null,
        unreadCount,
      });
    }

    // Sort by last message time (most recent first)
    conversations.sort((a, b) => {
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
    });

    return conversations;
  }

  // ── Read tracking ──

  async markChannelAsRead(userId: string, channelId: string) {
    await this.prisma.channelRead.upsert({
      where: { userId_channelId: { userId, channelId } },
      create: { userId, channelId, lastReadAt: new Date() },
      update: { lastReadAt: new Date() },
    });
  }

  async markDMAsRead(userId: string, otherUserId: string) {
    await this.prisma.dMRead.upsert({
      where: { userId_otherUserId: { userId, otherUserId } },
      create: { userId, otherUserId, lastReadAt: new Date() },
      update: { lastReadAt: new Date() },
    });
  }

  async getUnreadCounts(userId: string, workspaceId: string) {
    // Channel unreads
    const channels = await this.prisma.channel.findMany({
      where: { workspaceId },
      select: { id: true },
    });

    const channelCounts: Record<string, number> = {};
    for (const ch of channels) {
      const read = await this.prisma.channelRead.findUnique({
        where: { userId_channelId: { userId, channelId: ch.id } },
      });
      const count = await this.prisma.message.count({
        where: {
          channelId: ch.id,
          authorId: { not: userId },
          ...(read ? { createdAt: { gt: read.lastReadAt } } : {}),
        },
      });
      if (count > 0) channelCounts[ch.id] = count;
    }

    // DM unreads
    const dmMessages = await this.prisma.message.findMany({
      where: { dmTo: userId, channelId: null },
      select: { authorId: true },
      distinct: ['authorId'],
    });

    const dmCounts: Record<string, number> = {};
    for (const dm of dmMessages) {
      const read = await this.prisma.dMRead.findUnique({
        where: { userId_otherUserId: { userId, otherUserId: dm.authorId } },
      });
      const count = await this.prisma.message.count({
        where: {
          authorId: dm.authorId,
          dmTo: userId,
          channelId: null,
          ...(read ? { createdAt: { gt: read.lastReadAt } } : {}),
        },
      });
      if (count > 0) dmCounts[dm.authorId] = count;
    }

    return { channels: channelCounts, dms: dmCounts };
  }
}
