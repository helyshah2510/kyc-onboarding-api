import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdatePersonalDetailsDto {
  @ApiProperty({ example: '12, MG Road, Ahmedabad, Gujarat 380001' })
  @IsString()
  @IsNotEmpty()
  address: string;
}