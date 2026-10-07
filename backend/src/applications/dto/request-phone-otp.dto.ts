import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class RequestPhoneOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Invalid Indian phone number',
  })
  phone: string;
}