import { IsString, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MoveTaskDto {
  @ApiProperty()
  @IsString()
  columnId!: string;

  @ApiProperty()
  @IsInt()
  order!: number;
}
