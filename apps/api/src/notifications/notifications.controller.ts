import { Controller, Get, Patch, Param, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  findAll(@Req() req: Request) {
    return this.notificationsService.findByUser((req as any).user.id);
  }

  @Get('unread-count')
  getUnreadCount(@Req() req: Request) {
    return this.notificationsService.getUnreadCount((req as any).user.id);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Patch('read-all')
  markAllAsRead(@Req() req: Request) {
    return this.notificationsService.markAllAsRead((req as any).user.id);
  }
}
