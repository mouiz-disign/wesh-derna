import {
  Controller, Post, Get, Put, Delete, Param, Body, UseGuards, Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PagesService } from './pages.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('Pages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class PagesController {
  constructor(private pagesService: PagesService) {}

  @Post('workspaces/:workspaceId/pages')
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreatePageDto,
    @Req() req: Request,
  ) {
    return this.pagesService.create(workspaceId, (req as any).user.id, dto);
  }

  @Get('workspaces/:workspaceId/pages')
  findByWorkspace(@Param('workspaceId') workspaceId: string) {
    return this.pagesService.findByWorkspace(workspaceId);
  }

  @Get('pages/:id')
  findById(@Param('id') id: string) {
    return this.pagesService.findById(id);
  }

  @Put('pages/:id')
  update(@Param('id') id: string, @Body() dto: UpdatePageDto) {
    return this.pagesService.update(id, dto);
  }

  @Delete('pages/:id')
  delete(@Param('id') id: string) {
    return this.pagesService.delete(id);
  }
}
