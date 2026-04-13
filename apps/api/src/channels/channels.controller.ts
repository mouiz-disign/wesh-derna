import {
  Controller, Post, Get, Delete, Param, Body, Query, UseGuards, Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('Channels')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ChannelsController {
  constructor(private channelsService: ChannelsService) {}

  @Post('workspaces/:workspaceId/channels')
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateChannelDto,
  ) {
    return this.channelsService.create(workspaceId, dto);
  }

  @Get('workspaces/:workspaceId/channels')
  findByWorkspace(@Param('workspaceId') workspaceId: string) {
    return this.channelsService.findByWorkspace(workspaceId);
  }

  @Get('channels/:id/messages')
  getMessages(
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.channelsService.getMessages(id, cursor, limit ? parseInt(limit) : undefined);
  }

  @Post('channels/:id/messages')
  sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Req() req: Request,
  ) {
    return this.channelsService.sendMessage(id, dto, (req as any).user.id);
  }

  // Mark channel as read
  @Post('channels/:id/read')
  markChannelAsRead(@Param('id') id: string, @Req() req: Request) {
    return this.channelsService.markChannelAsRead((req as any).user.id, id);
  }

  // DMs
  @Post('dm/:userId')
  sendDM(
    @Param('userId') toUserId: string,
    @Body() dto: SendMessageDto,
    @Req() req: Request,
  ) {
    return this.channelsService.sendDM((req as any).user.id, toUserId, dto.content);
  }

  @Get('dm/:userId')
  getDMs(
    @Param('userId') otherUserId: string,
    @Query('cursor') cursor: string,
    @Req() req: Request,
  ) {
    return this.channelsService.getDMs((req as any).user.id, otherUserId, cursor);
  }

  @Post('dm/:userId/read')
  markDMAsRead(@Param('userId') otherUserId: string, @Req() req: Request) {
    return this.channelsService.markDMAsRead((req as any).user.id, otherUserId);
  }

  // DM conversations list
  @Get('workspaces/:workspaceId/dm-conversations')
  getDMConversations(@Param('workspaceId') workspaceId: string, @Req() req: Request) {
    return this.channelsService.getDMConversations((req as any).user.id, workspaceId);
  }

  // Unread counts
  @Get('workspaces/:workspaceId/unread-counts')
  getUnreadCounts(@Param('workspaceId') workspaceId: string, @Req() req: Request) {
    return this.channelsService.getUnreadCounts((req as any).user.id, workspaceId);
  }

  // Reactions
  @Post('messages/:messageId/reactions')
  toggleReaction(
    @Param('messageId') messageId: string,
    @Body() dto: { emoji: string },
    @Req() req: Request,
  ) {
    return this.channelsService.toggleReaction(messageId, (req as any).user.id, dto.emoji);
  }

  // Delete message
  @Delete('messages/:messageId')
  deleteMessage(@Param('messageId') messageId: string, @Req() req: Request) {
    return this.channelsService.deleteMessage(messageId, (req as any).user.id);
  }
}
