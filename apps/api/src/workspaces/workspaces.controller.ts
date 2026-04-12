import { Controller, Post, Get, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('Workspaces')
@Controller()
export class WorkspacesController {
  constructor(private workspacesService: WorkspacesService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('workspaces')
  create(@Body() dto: CreateWorkspaceDto, @Req() req: Request) {
    return this.workspacesService.create(dto, (req as any).user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('workspaces')
  findByUser(@Req() req: Request) {
    return this.workspacesService.findByUser((req as any).user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('workspaces/:id')
  findById(@Param('id') id: string, @Req() req: Request) {
    return this.workspacesService.findById(id, (req as any).user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('workspaces/:id/invite')
  inviteMember(
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
    @Req() req: Request,
  ) {
    return this.workspacesService.inviteMember(id, dto, (req as any).user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('workspaces/:id/invitations')
  getInvitations(@Param('id') id: string) {
    return this.workspacesService.getInvitations(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('workspaces/:id/members/:memberId/role')
  updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body('role') role: string,
    @Req() req: Request,
  ) {
    return this.workspacesService.updateMemberRole(id, memberId, role, (req as any).user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('workspaces/:id/members/:memberId')
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Req() req: Request,
  ) {
    return this.workspacesService.removeMember(id, memberId, (req as any).user.id);
  }

  // Routes publiques (pas de JWT)
  @Get('invitations/:token')
  getInvitationByToken(@Param('token') token: string) {
    return this.workspacesService.getInvitationByToken(token);
  }

  @Post('invitations/:token/accept')
  acceptInvitation(
    @Param('token') token: string,
    @Body() dto: AcceptInvitationDto,
  ) {
    return this.workspacesService.acceptInvitation(token, dto);
  }
}
