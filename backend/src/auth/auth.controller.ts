import { Controller,Body,Post } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto.js';
import { AuthService } from './auth.service.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import { CompleteRegistrationDto } from './dto/complete-registration.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Controller('auth')
export class AuthController {
    constructor(private authService:AuthService){}

    @Post('register/start')
    start(@Body() dto:RegisterDto){
        return this.authService.StartRegistration(dto);
    }

    @Post('register/verify-otp')
    verifyOtp(@Body() dto:VerifyOtpDto){
        return this.authService.verifyOtp(dto)
    }

    @Post('register/complete')
    complete(@Body() dto:CompleteRegistrationDto){
        return this.authService.completeRegistration(dto)
    }

    @Post('login')
    login(@Body()dto:LoginDto){
        return this.authService.login(dto);
    }
}
