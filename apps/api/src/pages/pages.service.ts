import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';

@Injectable()
export class PagesService {
  constructor(private prisma: PrismaService) {}

  async create(workspaceId: string, authorId: string, dto: CreatePageDto) {
    return this.prisma.page.create({
      data: {
        title: dto.title,
        icon: dto.icon,
        parentId: dto.parentId,
        workspaceId,
        authorId,
        content: dto.content || [],
      },
      include: { author: { select: { id: true, name: true, avatar: true } } },
    });
  }

  async findByWorkspace(workspaceId: string) {
    return this.prisma.page.findMany({
      where: { workspaceId, parentId: null },
      orderBy: { updatedAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        children: {
          select: { id: true, title: true, icon: true },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });
  }

  async findById(id: string) {
    const page = await this.prisma.page.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        children: {
          select: { id: true, title: true, icon: true },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });
    if (!page) throw new NotFoundException('Page non trouvee');
    return page;
  }

  async update(id: string, dto: UpdatePageDto) {
    return this.prisma.page.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        icon: dto.icon,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  async delete(id: string) {
    return this.prisma.page.delete({ where: { id } });
  }
}
