import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { ChannelsModule } from './channels/channels.module';
import { NotificationsModule } from './notifications/notifications.module';
import { GatewaysModule } from './gateways/gateways.module';
import { PagesModule } from './pages/pages.module';
import { AutomationsModule } from './automations/automations.module';
import { DeadlineCheckerService } from './tasks/deadline-checker.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    WorkspacesModule,
    ProjectsModule,
    TasksModule,
    ChannelsModule,
    NotificationsModule,
    GatewaysModule,
    PagesModule,
    AutomationsModule,
  ],
  providers: [DeadlineCheckerService],
})
export class AppModule {}
