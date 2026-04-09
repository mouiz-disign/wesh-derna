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

  async create(dto: CreateTaskDto) {
    const maxOrder = await this.prisma.task.aggregate({
      where: { columnId: dto.columnId },
      _max: { order: true },
    });

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority || 'MEDIUM',
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        columnId: dto.columnId,
        projectId: dto.projectId,
        assigneeId: dto.assigneeId,
        order: (maxOrder._max.order ?? -1) + 1,
      },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        tags: true,
      },
    });

    // Notify assignee
    if (task.assigneeId) {
      const notif = await this.notifications.create({
        userId: task.assigneeId,
        type: 'task.assigned',
        title: 'Nouvelle tache assignee',
        message: `Vous avez ete assigne a "${task.title}"`,
        link: `/projects/${task.projectId}`,
      });
      this.gateway.emitToUser(task.assigneeId, 'notification:new', { notification: notif });
    }

    return task;
  }

  async findById(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        tags: true,
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, name: true, avatar: true } } },
        },
      },
    });
    if (!task) throw new NotFoundException('Tache non trouvee');
    return task;
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
}
