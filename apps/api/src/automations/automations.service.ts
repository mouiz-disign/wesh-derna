import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatGateway } from '../gateways/chat.gateway';
import { CreateAutomationDto } from './dto/create-automation.dto';

@Injectable()
export class AutomationsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private gateway: ChatGateway,
  ) {}

  async create(dto: CreateAutomationDto) {
    return this.prisma.automation.create({ data: dto });
  }

  async findByProject(projectId: string) {
    return this.prisma.automation.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggle(id: string) {
    const auto = await this.prisma.automation.findUnique({ where: { id } });
    if (!auto) return null;
    return this.prisma.automation.update({
      where: { id },
      data: { enabled: !auto.enabled },
    });
  }

  async delete(id: string) {
    return this.prisma.automation.delete({ where: { id } });
  }

  // Called when a task is moved to a column
  async runTrigger(
    trigger: string,
    context: { taskId: string; projectId: string; columnName?: string; assigneeId?: string },
  ) {
    const automations = await this.prisma.automation.findMany({
      where: {
        projectId: context.projectId,
        trigger,
        enabled: true,
      },
    });

    for (const auto of automations) {
      const condition = auto.condition as Record<string, string>;
      const actionData = auto.actionData as Record<string, string>;

      // Check condition
      if (condition.columnName && condition.columnName !== context.columnName) continue;

      // Execute action
      if (auto.action === 'notify' && actionData.userId) {
        const task = await this.prisma.task.findUnique({ where: { id: context.taskId } });
        if (task) {
          const notif = await this.notifications.create({
            userId: actionData.userId,
            type: 'automation',
            title: auto.name,
            message: actionData.message || `Automation: ${task.title}`,
            link: `/projects/${context.projectId}`,
          });
          this.gateway.emitToUser(actionData.userId, 'notification:new', { notification: notif });
        }
      }
    }
  }
}
