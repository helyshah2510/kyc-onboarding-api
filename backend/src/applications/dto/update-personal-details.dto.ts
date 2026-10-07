import { IsNotEmpty, IsString } from 'class-validator';

export class UpdatePersonalDetailsDto {
  @IsString()
  @IsNotEmpty()
  address: string;
}