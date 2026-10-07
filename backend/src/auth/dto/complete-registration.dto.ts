import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Matches } from 'class-validator';

export class CompleteRegistrationDto {
  @ApiProperty({ example: '9999999991', description: 'Phone number that was verified with OTP' })
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, { message: 'Invalid Indian phone number' })
  phone: string;
}