import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatGateway } from '../gateways/chat.gateway';
import { AutomationsService } from '../automations/automations.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private gateway: ChatGateway,
    private automations: AutomationsService,
  ) {}

  async getMyTasks(userId: string) {
    return this.prisma.task.findMany({
      where: { assigneeId: userId },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        tags: true,
        column: { select: { id: true, name: true, color: true } },
        project: { select: { id: true, name: true, color: true, workspaceId: true } },
        subtasks: { select: { done: true } },
        _count: { select: { comments: true, subtasks: true, attachments: true } },
      },
      orderBy: [{ deadline: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
    });
  }

  private async resolveAssignees(task: any) {
    const ids = (task.assigneeIds as string[]) || [];
    if (ids.length === 0) return { ...task, assignees: task.assignee ? [task.assignee] : [] };
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, avatar: true },
    });
    return { ...task, assignees: users };
  }

  async create(dto: CreateTaskDto) {
    const maxOrder = await this.prisma.task.aggregate({
      where: { columnId: dto.columnId },
      _max: { order: true },
    });

    const ids = dto.assigneeIds || (dto.assigneeId ? [dto.assigneeId] : []);

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority || 'MEDIUM',
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        columnId: dto.columnId,
        projectId: dto.projectId,
        assigneeId: dto.assigneeId || ids[0] || null,
        assigneeIds: ids as any,
        order: (maxOrder._max.order ?? -1) + 1,
      },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        tags: true,
      },
    });

    // Notify assignee directly
    if (task.assigneeId) {
      const notif = await this.notifications.create({
        userId: task.assigneeId,
        type: 'task.assigned',
        title: 'Nouvelle tache assignee',
        message: `Vous avez ete assigne a "${task.title}"`,
        link: `/projects/${task.projectId}`,
        projectId: task.projectId,
      });
      this.gateway.emitToUser(task.assigneeId, 'notification:new', { notification: notif });
    }

    // Notify project members with notifs enabled (except creator and assignee)
    const recipients = await this.notifications.getNotifRecipients(task.projectId, dto.assigneeId || '');
    for (const userId of recipients) {
      if (userId === task.assigneeId) continue; // already notified above
      const notif = await this.notifications.create({
        userId,
        type: 'task.created',
        title: 'Nouvelle tache',
        message: `"${task.title}" a ete ajoutee au projet`,
        link: `/projects/${task.projectId}`,
        projectId: task.projectId,
      });
      this.gateway.emitToUser(userId, 'notification:new', { notification: notif });
    }

    return task;
  }

  async findById(id: string) {
    const raw = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        tags: true,
        subtasks: { orderBy: { order: 'asc' } },
        attachments: { orderBy: { createdAt: 'desc' } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, name: true, avatar: true } } },
        },
      },
    });
    if (!raw) throw new NotFoundException('Tache non trouvee');
    return this.resolveAssignees(raw);
  }

  async update(id: string, dto: UpdateTaskDto) {
    const existing = await this.prisma.task.findUnique({ where: { id } });

    const task = await this.prisma.task.update({
      where: { id },
      data: {
        ...dto,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        tags: true,
      },
    });

    // Notify if assignee changed
    if (dto.assigneeId && dto.assigneeId !== existing?.assigneeId) {
      const notif = await this.notifications.create({
        userId: dto.assigneeId,
        type: 'task.assigned',
        title: 'Tache assignee',
        message: `Vous avez ete assigne a "${task.title}"`,
        link: `/projects/${task.projectId}`,
        projectId: task.projectId,
      });
      this.gateway.emitToUser(dto.assigneeId, 'notification:new', { notification: notif });
    }

    return task;
  }

  async move(id: string, dto: MoveTaskDto) {
    const task = await this.prisma.task.update({
      where: { id },
      data: {
        columnId: dto.columnId,
        order: dto.order,
      },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        tags: true,
        column: { select: { name: true } },
      },
    });

    // Run automations
    this.automations.runTrigger('task.moved', {
      taskId: task.id,
      projectId: task.projectId,
      columnName: task.column.name,
    });

    return task;
  }

  async delete(id: string) {
    return this.prisma.task.delete({ where: { id } });
  }

  async addComment(taskId: string, content: string, authorId: string) {
    const comment = await this.prisma.comment.create({
      data: { content, taskId, authorId },
      include: { author: { select: { id: true, name: true, avatar: true } } },
    });

    // Notify task assignee if different from commenter
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (task?.assigneeId && task.assigneeId !== authorId) {
      const notif = await this.notifications.create({
        userId: task.assigneeId,
        type: 'task.commented',
        title: 'Nouveau commentaire',
        message: `${comment.author.name} a commente "${task.title}"`,
        link: `/projects/${task.projectId}`,
      });
      this.gateway.emitToUser(task.assigneeId, 'notification:new', { notification: notif });
    }

    return comment;
  }

  // ── Voice note ──

  async setVoiceNote(id: string, voiceNoteUrl: string | null) {
    return this.prisma.task.update({
      where: { id },
      data: { voiceNoteUrl },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        tags: true,
      },
    });
  }

  // ── Attachments ──

  async addAttachment(taskId: string, file: { filename: string; url: string; mimeType: string; size: number }) {
    return this.prisma.attachment.create({
      data: {
        filename: file.filename,
        url: file.url,
        mimeType: file.mimeType,
        size: file.size,
        taskId,
      },
    });
  }

  async getAttachments(taskId: string) {
    return this.prisma.attachment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteAttachment(attachmentId: string) {
    return this.prisma.attachment.delete({ where: { id: attachmentId } });
  }

  // ── Subtasks ──

  async addSubtask(taskId: string, title: string) {
    const maxOrder = await this.prisma.subtask.aggregate({
      where: { taskId },
      _max: { order: true },
    });
    return this.prisma.subtask.create({
      data: {
        title,
        taskId,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });
  }

  async toggleSubtask(subtaskId: string) {
    const subtask = await this.prisma.subtask.findUnique({ where: { id: subtaskId } });
    if (!subtask) return null;
    return this.prisma.subtask.update({
      where: { id: subtaskId },
      data: { done: !subtask.done },
    });
  }

  async updateSubtask(subtaskId: string, data: { title?: string; weight?: number; assigneeId?: string | null }) {
    return this.prisma.subtask.update({
      where: { id: subtaskId },
      data,
    });
  }

  async reorderSubtasks(taskId: string, subtaskIds: string[]) {
    const updates = subtaskIds.map((id, index) =>
      this.prisma.subtask.update({ where: { id }, data: { order: index } }),
    );
    await this.prisma.$transaction(updates);
    return this.prisma.subtask.findMany({
      where: { taskId },
      orderBy: { order: 'asc' },
    });
  }

  async deleteSubtask(subtaskId: string) {
    return this.prisma.subtask.delete({ where: { id: subtaskId } });
  }

  async getSubtasks(taskId: string) {
    return this.prisma.subtask.findMany({
      where: { taskId },
      orderBy: { order: 'asc' },
    });
  }
}
