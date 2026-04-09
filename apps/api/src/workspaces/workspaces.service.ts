import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';

@Injectable()
export class WorkspacesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWorkspaceDto, userId: string) {
    const slug = dto.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const workspace = await this.prisma.workspace.create({
      data: {
        name: dto.name,
        slug: `${slug}-${Date.now().toString(36)}`,
        members: {
          create: { userId, role: 'ADMIN' },
        },
        channels: {
          create: { name: 'general' },
        },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        channels: true,
      },
    });

    return workspace;
  }

  async findByUser(userId: string) {
    return this.prisma.workspace.findMany({
      where: { members: { some: { userId } } },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
        },
        _count: { select: { projects: true, channels: true } },
      },
    });
  }

  async findById(id: string, userId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
        },
        projects: true,
        channels: true,
      },
    });

    if (!workspace) throw new NotFoundException('Workspace non trouvé');

    const isMember = workspace.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('Accès refusé');

    return workspace;
  }

  async inviteMember(workspaceId: string, dto: InviteMemberDto, userId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true },
    });

    if (!workspace) throw new NotFoundException('Workspace non trouvé');

    const admin = workspace.members.find((m) => m.userId === userId);
    if (!admin || admin.role !== 'ADMIN') {
      throw new ForbiddenException('Seuls les admins peuvent inviter');
    }

    const invitedUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!invitedUser) throw new NotFoundException('Utilisateur non trouvé');

    const alreadyMember = workspace.members.some((m) => m.userId === invitedUser.id);
    if (alreadyMember) throw new ForbiddenException('Déjà membre');

    return this.prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: invitedUser.id,
        role: dto.role || 'MEMBER',
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }
}
