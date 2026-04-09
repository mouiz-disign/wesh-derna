import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAutomationDto {
  @ApiProperty({ example: 'Notifier quand Done' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'task.moved' })
  @IsString()
  trigger!: string;

  @ApiPropertyOptional({ example: { columnName: 'Done' } })
  @IsOptional()
  @IsObject()
  condition?: Record<string, string>;

  @ApiProperty({ example: 'notify' })
  @IsString()
  action!: string;

  @ApiPropertyOptional({ example: { userId: 'xxx', message: 'Tache terminee' } })
  @IsOptional()
  @IsObject()
  actionData?: Record<string, string>;

  @ApiProperty()
  @IsString()
  projectId!: string;

  @ApiProperty()
  @IsString()
  workspaceId!: string;
}
