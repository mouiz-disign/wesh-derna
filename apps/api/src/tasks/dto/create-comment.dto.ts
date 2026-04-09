import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ example: 'Super travail !' })
  @IsString()
  @MinLength(1)
  content!: string;
}
