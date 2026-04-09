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

    if (!workspace) throw new NotFoundException('Workspace non trouve');

    const admin = workspace.members.find((m) => m.userId === userId);
    if (!admin || admin.role !== 'ADMIN') {
      throw new ForbiddenException('Seuls les admins peuvent inviter');
    }

    // Verifier si deja membre
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) {
      const alreadyMember = workspace.members.some((m) => m.userId === existingUser.id);
      if (alreadyMember) throw new ForbiddenException('Deja membre de ce workspace');
    }

    // Verifier invitation en attente
    const pendingInvite = await this.prisma.invitation.findFirst({
      where: { email: dto.email, workspaceId, status: 'pending' },
    });
    if (pendingInvite) throw new ForbiddenException('Invitation deja envoyee');

    // Creer l'invitation
    const invitation = await this.prisma.invitation.create({
      data: {
        email: dto.email,
        role: dto.role || 'MEMBER',
        workspaceId,
        invitedBy: userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
      },
    });

    return {
      invitation,
      inviteLink: `${process.env.CORS_ORIGIN || 'http://localhost:7001'}/invite/${invitation.token}`,
    };
  }

  async getInvitations(workspaceId: string) {
    return this.prisma.invitation.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInvitationByToken(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: { workspace: { select: { id: true, name: true, logo: true } } },
    });

    if (!invitation) throw new NotFoundException('Invitation non trouvee');
    if (invitation.status !== 'pending') throw new ForbiddenException('Invitation deja utilisee');
    if (new Date() > invitation.expiresAt) throw new ForbiddenException('Invitation expiree');

    return invitation;
  }

  async acceptInvitation(token: string, data: {
    firstName: string;
    lastName: string;
    password: string;
    poste?: string;
    fonction?: string;
  }) {
    const invitation = await this.getInvitationByToken(token);

    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Creer ou mettre a jour l'utilisateur
    let user = await this.prisma.user.findUnique({ where: { email: invitation.email } });

    if (user) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          name: `${data.firstName} ${data.lastName}`,
          password: hashedPassword,
          poste: data.poste,
          fonction: data.fonction,
        },
      });
    } else {
      user = await this.prisma.user.create({
        data: {
          email: invitation.email,
          firstName: data.firstName,
          lastName: data.lastName,
          name: `${data.firstName} ${data.lastName}`,
          password: hashedPassword,
          poste: data.poste,
          fonction: data.fonction,
        },
      });
    }

    // Ajouter au workspace
    await this.prisma.workspaceMember.create({
      data: {
        workspaceId: invitation.workspaceId,
        userId: user.id,
        role: invitation.role,
      },
    });

    // Marquer l'invitation comme acceptee
    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted' },
    });

    return { user: { id: user.id, email: user.email, name: user.name } };
  }
}
