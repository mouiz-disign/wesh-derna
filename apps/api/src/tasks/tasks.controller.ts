import {
  Controller, Post, Get, Put, Patch, Delete, Param, Body, UseGuards, Req,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Request } from 'express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get('mine')
  getMyTasks(@Req() req: Request) {
    return this.tasksService.getMyTasks((req as any).user.id);
  }

  @Post()
  create(@Body() dto: CreateTaskDto) {
    return this.tasksService.create(dto);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.tasksService.findById(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(id, dto);
  }

  @Patch(':id/move')
  move(@Param('id') id: string, @Body() dto: MoveTaskDto, @Req() req: Request) {
    return this.tasksService.move(id, dto, (req as any).user.id);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.tasksService.delete(id);
  }

  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @Req() req: Request,
  ) {
    return this.tasksService.addComment(id, dto.content, (req as any).user.id);
  }

  // Voice note upload
  @Post(':id/voice-note')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'voice-notes'),
        filename: (_req, file, cb) => {
          const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname) || '.webm'}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
      fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
          cb(null, true);
        } else {
          cb(new Error('Seuls les fichiers audio sont acceptes'), false);
        }
      },
    }),
  )
  uploadVoiceNote(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const voiceNoteUrl = `/uploads/voice-notes/${file.filename}`;
    return this.tasksService.setVoiceNote(id, voiceNoteUrl);
  }

  @Delete(':id/voice-note')
  removeVoiceNote(@Param('id') id: string) {
    return this.tasksService.setVoiceNote(id, null);
  }

  // Attachments
  @Post(':id/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'attachments'),
        filename: (_req, file, cb) => {
          const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
    }),
  )
  uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.tasksService.addAttachment(id, {
      filename: file.originalname,
      url: `/uploads/attachments/${file.filename}`,
      mimeType: file.mimetype,
      size: file.size,
    });
  }

  @Get(':id/attachments')
  getAttachments(@Param('id') id: string) {
    return this.tasksService.getAttachments(id);
  }

  @Delete('attachments/:attachmentId')
  deleteAttachment(@Param('attachmentId') attachmentId: string) {
    return this.tasksService.deleteAttachment(attachmentId);
  }

  // Subtasks
  @Get(':id/subtasks')
  getSubtasks(@Param('id') id: string) {
    return this.tasksService.getSubtasks(id);
  }

  @Post(':id/subtasks')
  addSubtask(@Param('id') id: string, @Body() dto: { title: string }) {
    return this.tasksService.addSubtask(id, dto.title);
  }

  @Patch('subtasks/:subtaskId/toggle')
  toggleSubtask(@Param('subtaskId') subtaskId: string) {
    return this.tasksService.toggleSubtask(subtaskId);
  }

  @Patch('subtasks/:subtaskId')
  updateSubtask(@Param('subtaskId') subtaskId: string, @Body() dto: { title?: string; weight?: number }) {
    return this.tasksService.updateSubtask(subtaskId, dto);
  }

  @Patch(':id/subtasks/reorder')
  reorderSubtasks(@Param('id') taskId: string, @Body() dto: { subtaskIds: string[] }) {
    return this.tasksService.reorderSubtasks(taskId, dto.subtaskIds);
  }

  @Delete('subtasks/:subtaskId')
  deleteSubtask(@Param('subtaskId') subtaskId: string) {
    return this.tasksService.deleteSubtask(subtaskId);
  }
}
