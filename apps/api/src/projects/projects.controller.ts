import {
  Controller, Post, Get, Put, Delete, Param, Body, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

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
  ) {
    return this.projectsService.create(workspaceId, dto);
  }

  @Get('workspaces/:workspaceId/projects')
  findByWorkspace(@Param('workspaceId') workspaceId: string) {
    return this.projectsService.findByWorkspace(workspaceId);
  }

  @Get('workspaces/:workspaceId/stats')
  getStats(@Param('workspaceId') workspaceId: string) {
    return this.projectsService.getStats(workspaceId);
  }

  @Get('projects/:id')
  findById(@Param('id') id: string) {
    return this.projectsService.findById(id);
  }

  @Put('projects/:id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @Delete('projects/:id')
  delete(@Param('id') id: string) {
    return this.projectsService.delete(id);
  }
}
