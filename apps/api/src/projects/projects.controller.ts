import {
  Controller, Post, Get, Put, Delete, Patch, Param, Body, UseGuards, Req,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { IsString, IsOptional, IsInt, IsArray } from 'class-validator';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

class CreateColumnDto {
  @IsString() name!: string;
  @IsOptional() @IsString() color?: string;
}

class UpdateColumnDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() color?: string;
}

class ReorderColumnsDto {
  @IsArray() columnIds!: string[];
}

class ApplyTemplateDto {
  @IsString() template!: string;
}

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Post('workspaces/:workspaceId/projects')
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateProjectDto,
    @Req() req: Request,
  ) {
    return this.projectsService.create(workspaceId, dto, (req as any).user.id);
  }

  @Get('workspaces/:workspaceId/projects')
  findByWorkspace(@Param('workspaceId') workspaceId: string, @Req() req: Request) {
    return this.projectsService.findByWorkspace(workspaceId, (req as any).user.id);
  }

  @Get('workspaces/:workspaceId/stats')
  getStats(@Param('workspaceId') workspaceId: string) {
    return this.projectsService.getStats(workspaceId);
  }

  @Get('projects/:id')
  findById(@Param('id') id: string, @Req() req: Request) {
    return this.projectsService.findById(id, (req as any).user.id);
  }

  @Get('projects/:id/members')
  getProjectMembers(@Param('id') id: string) {
    return this.projectsService.getProjectMembers(id);
  }

  @Post('projects/:id/members')
  addProjectMember(@Param('id') id: string, @Body('userId') userId: string) {
    return this.projectsService.addProjectMember(id, userId);
  }

  @Delete('projects/:id/members/:userId')
  removeProjectMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.projectsService.removeProjectMember(id, userId);
  }

  // Notification settings
  @Get('projects/:id/notif-settings')
  getNotifSettings(@Param('id') id: string) {
    return this.projectsService.getNotifSettings(id);
  }

  @Patch('projects/:id/notif-settings/:userId')
  updateNotifSetting(
    @Param('id') projectId: string,
    @Param('userId') userId: string,
    @Body() dto: { enabled: boolean },
  ) {
    return this.projectsService.updateNotifSetting(projectId, userId, dto.enabled);
  }

  @Put('projects/:id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @Delete('projects/:id')
  delete(@Param('id') id: string) {
    return this.projectsService.delete(id);
  }

  // Column management
  @Post('projects/:id/columns')
  addColumn(@Param('id') id: string, @Body() dto: CreateColumnDto) {
    return this.projectsService.addColumn(id, dto.name, dto.color);
  }

  @Put('columns/:columnId')
  updateColumn(@Param('columnId') columnId: string, @Body() dto: UpdateColumnDto) {
    return this.projectsService.updateColumn(columnId, dto);
  }

  @Delete('columns/:columnId')
  deleteColumn(@Param('columnId') columnId: string) {
    return this.projectsService.deleteColumn(columnId);
  }

  @Patch('projects/:id/columns/reorder')
  reorderColumns(@Param('id') id: string, @Body() dto: ReorderColumnsDto) {
    return this.projectsService.reorderColumns(id, dto.columnIds);
  }

  // Templates
  @Get('column-templates')
  getTemplates() {
    return this.projectsService.getTemplates();
  }

  @Post('projects/:id/apply-template')
  applyTemplate(@Param('id') id: string, @Body() dto: ApplyTemplateDto) {
    return this.projectsService.applyTemplate(id, dto.template);
  }

  // ── Voice Notes ──

  @Post('projects/:id/voice-notes')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'voice-notes'),
        filename: (_req, file, cb) => {
          cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname) || '.webm'}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  createVoiceNote(
    @Param('id') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { duration?: string },
    @Req() req: Request,
  ) {
    return this.projectsService.createVoiceNote(projectId, (req as any).user.id, {
      url: `/uploads/voice-notes/${file.filename}`,
      duration: parseInt(body.duration || '0') || 0,
    });
  }

  @Get('projects/:id/voice-notes')
  getVoiceNotes(@Param('id') projectId: string) {
    return this.projectsService.getVoiceNotes(projectId);
  }

  @Delete('voice-notes/:id')
  deleteVoiceNote(@Param('id') id: string) {
    return this.projectsService.deleteVoiceNote(id);
  }

  @Post('voice-notes/:id/convert')
  convertVoiceNote(@Param('id') id: string, @Body() dto: { title: string; columnId: string; priority?: string; assigneeIds?: string[]; deadline?: string }) {
    return this.projectsService.convertVoiceNoteToTask(id, dto);
  }

  @Patch('voice-notes/:id/link')
  linkVoiceNote(@Param('id') id: string, @Body() dto: { taskId: string }) {
    return this.projectsService.linkVoiceNoteToTask(id, dto.taskId);
  }
}
