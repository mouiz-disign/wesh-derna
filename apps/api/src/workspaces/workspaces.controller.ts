import { Controller, Post, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('Workspaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private workspacesService: WorkspacesService) {}

  @Post()
  create(@Body() dto: CreateWorkspaceDto, @Req() req: Request) {
    return this.workspacesService.create(dto, (req as any).user.id);
  }

  @Get()
  findByUser(@Req() req: Request) {
    return this.workspacesService.findByUser((req as any).user.id);
  }

  @Get(':id')
  findById(@Param('id') id: string, @Req() req: Request) {
    return this.workspacesService.findById(id, (req as any).user.id);
  }

  @Post(':id/invite')
  inviteMember(
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
    @Req() req: Request,
  ) {
    return this.workspacesService.inviteMember(id, dto, (req as any).user.id);
  }
}
