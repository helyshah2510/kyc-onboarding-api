import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class VerifyOtpDto {
    @IsNotEmpty()
    @IsString()
    @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
    otp: string;
    
    @IsNotEmpty()
    @Matches(/^[6-9]\d{9}$/, {
        message: 'Invalid Indian phone number',
    })
    phone: string;

}