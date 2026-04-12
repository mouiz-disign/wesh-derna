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

    // Creer l'invitation (lien generique, avec projet optionnel)
    const invitation = await this.prisma.invitation.create({
      data: {
        role: dto.role || 'MEMBER',
        workspaceId,
        projectId: dto.projectId || null,
        invitedBy: userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
      },
    });

    return {
      invitation,
      token: invitation.token,
    };
  }

  async updateMemberRole(workspaceId: string, memberId: string, role: string, userId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true },
    });
    if (!workspace) throw new NotFoundException('Workspace non trouve');

    const admin = workspace.members.find((m) => m.userId === userId);
    if (!admin || admin.role !== 'ADMIN') {
      throw new ForbiddenException('Seuls les admins peuvent modifier les roles');
    }

    const target = workspace.members.find((m) => m.id === memberId);
    if (!target) throw new NotFoundException('Membre non trouve');
    if (target.userId === userId) throw new ForbiddenException('Vous ne pouvez pas modifier votre propre role');

    return this.prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role: role as any },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    });
  }

  async removeMember(workspaceId: string, memberId: string, userId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true },
    });
    if (!workspace) throw new NotFoundException('Workspace non trouve');

    const admin = workspace.members.find((m) => m.userId === userId);
    if (!admin || admin.role !== 'ADMIN') {
      throw new ForbiddenException('Seuls les admins peuvent supprimer des membres');
    }

    const target = workspace.members.find((m) => m.id === memberId);
    if (!target) throw new NotFoundException('Membre non trouve');
    if (target.userId === userId) throw new ForbiddenException('Vous ne pouvez pas vous supprimer vous-meme');

    // Remove from all projects too
    await this.prisma.projectMember.deleteMany({
      where: { userId: target.userId, project: { workspaceId } },
    });

    return this.prisma.workspaceMember.delete({ where: { id: memberId } });
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
      include: {
        workspace: { select: { id: true, name: true, logo: true } },
        project: { select: { id: true, name: true } },
      },
    });

    if (!invitation) throw new NotFoundException('Invitation non trouvee');
    if (invitation.status !== 'pending') throw new ForbiddenException('Invitation deja utilisee');
    if (new Date() > invitation.expiresAt) throw new ForbiddenException('Invitation expiree');

    return invitation;
  }

  async acceptInvitation(token: string, data: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    poste?: string;
    fonction?: string;
  }) {
    const invitation = await this.getInvitationByToken(token);

    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Verifier si deja membre
    const existingUser = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      const alreadyMember = await this.prisma.workspaceMember.findFirst({
        where: { workspaceId: invitation.workspaceId, userId: existingUser.id },
      });
      if (alreadyMember) throw new ForbiddenException('Deja membre de ce workspace');
    }

    // Creer ou mettre a jour l'utilisateur
    let user = existingUser;

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
          email: data.email,
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
    await this.prisma.workspaceMember.upsert({
      where: { userId_workspaceId: { userId: user.id, workspaceId: invitation.workspaceId } },
      create: {
        workspaceId: invitation.workspaceId,
        userId: user.id,
        role: invitation.role,
      },
      update: {},
    });

    // Ajouter au projet ou a tous les projets du workspace
    if (invitation.projectId) {
      await this.prisma.projectMember.upsert({
        where: { userId_projectId: { userId: user.id, projectId: invitation.projectId } },
        create: {
          projectId: invitation.projectId,
          userId: user.id,
          role: invitation.role,
        },
        update: {},
      });
    } else {
      // Pas de projet specifique -> ajouter a tous les projets du workspace
      const projects = await this.prisma.project.findMany({
        where: { workspaceId: invitation.workspaceId },
        select: { id: true },
      });
      for (const project of projects) {
        await this.prisma.projectMember.upsert({
          where: { userId_projectId: { userId: user.id, projectId: project.id } },
          create: {
            projectId: project.id,
            userId: user.id,
            role: invitation.role,
          },
          update: {},
        });
      }
    }

    // Marquer l'invitation comme acceptee
    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted' },
    });

    return { user: { id: user.id, email: user.email, name: user.name } };
  }
}
