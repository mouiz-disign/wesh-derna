import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatGateway } from '../gateways/chat.gateway';

@Injectable()
export class DeadlineCheckerService {
  private readonly logger = new Logger(DeadlineCheckerService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private gateway: ChatGateway,
  ) {}

  // Run every hour
  @Cron(CronExpression.EVERY_HOUR)
  async checkDeadlines() {
    this.logger.log('Checking task deadlines...');

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Tasks with deadline today that haven't been notified yet
    const tasks = await this.prisma.task.findMany({
      where: {
        deadline: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    });

    for (const task of tasks) {
      // Get all assignees (from assigneeIds JSON or fallback to assigneeId)
      const assigneeIds: string[] = (task.assigneeIds as string[]) || (task.assigneeId ? [task.assigneeId] : []);

      for (const userId of assigneeIds) {
        // Check if already notified today for this task
        const existing = await this.prisma.notification.findFirst({
          where: {
            userId,
            type: 'task.deadline',
            message: { contains: task.id },
            createdAt: { gte: todayStart },
          },
        });

        if (existing) continue;

        const notif = await this.notifications.create({
          userId,
          type: 'task.deadline',
          title: 'Echeance aujourd\'hui',
          message: `La tache "${task.title}" arrive a echeance aujourd'hui — ${task.id}`,
          link: `/projects/${task.projectId}`,
          projectId: task.projectId,
        });

        this.gateway.emitToUser(userId, 'notification:new', { notification: notif });
      }
    }

    // Also check overdue tasks (deadline passed)
    const overdueTasks = await this.prisma.task.findMany({
      where: {
        deadline: { lt: todayStart },
      },
      include: {
        project: { select: { id: true, name: true } },
        column: { select: { name: true } },
      },
    });

    for (const task of overdueTasks) {
      // Skip if in "Done" column
      if (task.column.name.toLowerCase().includes('done') || task.column.name.toLowerCase().includes('termine')) continue;

      const assigneeIds: string[] = (task.assigneeIds as string[]) || (task.assigneeId ? [task.assigneeId] : []);

      for (const userId of assigneeIds) {
        // Check if already notified this week for overdue
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const existing = await this.prisma.notification.findFirst({
          where: {
            userId,
            type: 'task.overdue',
            message: { contains: task.id },
            createdAt: { gte: weekAgo },
          },
        });

        if (existing) continue;

        const notif = await this.notifications.create({
          userId,
          type: 'task.overdue',
          title: 'Tache en retard',
          message: `La tache "${task.title}" est en retard — ${task.id}`,
          link: `/projects/${task.projectId}`,
          projectId: task.projectId,
        });

        this.gateway.emitToUser(userId, 'notification:new', { notification: notif });
      }
    }

    this.logger.log(`Checked ${tasks.length} deadline tasks, ${overdueTasks.length} overdue tasks`);
  }
}
