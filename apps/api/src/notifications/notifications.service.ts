import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findByUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async create(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    projectId?: string;
  }) {
    return this.prisma.notification.create({ data });
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { read: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, read: false },
    });
  }

  // Get read report for a task's notifications (admin view)
  async getTaskNotifReport(taskId: string, projectId: string) {
    const notifs = await this.prisma.notification.findMany({
      where: {
        type: { in: ['task.assigned', 'task.created'] },
        link: { contains: projectId },
        message: { contains: taskId },
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return notifs;
  }

  async getNotifsByProject(projectId: string) {
    return this.prisma.notification.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // Get notif recipients for a project (who should be notified)
  async getNotifRecipients(projectId: string, excludeUserId: string): Promise<string[]> {
    // Get project members
    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      select: { userId: true },
    });

    const memberIds = members.map((m) => m.userId).filter((id) => id !== excludeUserId);

    // Check notif settings — if setting exists and disabled, exclude
    const settings = await this.prisma.projectNotifSetting.findMany({
      where: { projectId, userId: { in: memberIds } },
    });

    const disabledUsers = new Set(settings.filter((s) => !s.enabled).map((s) => s.userId));

    return memberIds.filter((id) => !disabledUsers.has(id));
  }
}
