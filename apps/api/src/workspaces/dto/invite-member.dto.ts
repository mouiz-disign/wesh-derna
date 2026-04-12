import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

enum Role {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

export class InviteMemberDto {
  @ApiPropertyOptional({ enum: Role, default: Role.MEMBER })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ example: 'cuid-project-id' })
  @IsOptional()
  @IsString()
  projectId?: string;
}
