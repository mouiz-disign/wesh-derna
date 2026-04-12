import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AcceptInvitationDto {
  @ApiProperty({ example: 'samy@example.com' })
  @IsString()
  @MinLength(1)
  email!: string;

  @ApiProperty({ example: 'Samy' })
  @IsString()
  @MinLength(1)
  firstName!: string;

  @ApiProperty({ example: 'Mohandi' })
  @IsString()
  @MinLength(1)
  lastName!: string;

  @ApiProperty({ example: 'monmotdepasse' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({ example: 'Developpeur Full-Stack' })
  @IsOptional()
  @IsString()
  poste?: string;

  @ApiPropertyOptional({ example: 'CTO' })
  @IsOptional()
  @IsString()
  fonction?: string;
}
