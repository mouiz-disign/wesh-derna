import {
  Controller, Post, Get, Patch, Delete, Param, Body, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AutomationsService } from './automations.service';
import { CreateAutomationDto } from './dto/create-automation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Automations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class AutomationsController {
  constructor(private automationsService: AutomationsService) {}

  @Post('automations')
  create(@Body() dto: CreateAutomationDto) {
    return this.automationsService.create(dto);
  }

  @Get('projects/:projectId/automations')
  findByProject(@Param('projectId') projectId: string) {
    return this.automationsService.findByProject(projectId);
  }

  @Patch('automations/:id/toggle')
  toggle(@Param('id') id: string) {
    return this.automationsService.toggle(id);
  }

  @Delete('automations/:id')
  delete(@Param('id') id: string) {
    return this.automationsService.delete(id);
  }
}
