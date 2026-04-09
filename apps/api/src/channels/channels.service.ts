import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { SendMessageDto } from './dto/send-message.dto';

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
      where: { channelId },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
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
      },
    });
    return messages.reverse();
  }
}
