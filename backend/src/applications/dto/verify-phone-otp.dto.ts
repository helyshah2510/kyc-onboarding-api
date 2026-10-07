import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class VerifyPhoneOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, {
    message: 'OTP must be 6 digits',
  })
  otp: string;
}