import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 'Salut tout le monde !' })
  @IsString()
  @MinLength(1)
  content!: string;
}
