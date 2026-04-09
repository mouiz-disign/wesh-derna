import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { AutomationsModule } from '../automations/automations.module';

@Module({
  imports: [NotificationsModule, GatewaysModule, AutomationsModule],
  providers: [TasksService],
  controllers: [TasksController],
  exports: [TasksService],
})
export class TasksModule {}
