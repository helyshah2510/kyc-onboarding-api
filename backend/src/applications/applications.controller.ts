import { Body, Controller, Param, Post, Patch,ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { ApplicationsService } from './applications.service.js';
import { VerifyPanDto } from '../pan/dto/verify-pan.dto.js';
import { RequestPhoneOtpDto } from './dto/request-phone-otp.dto.js';
import { VerifyPhoneOtpDto } from './dto/verify-phone-otp.dto.js';
import { UpdatePersonalDetailsDto } from './dto/update-personal-details.dto.js';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/guard/jwt-auth.guard.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationsController {
    constructor(private readonly applicationsService: ApplicationsService) { }

    @Post()
    createApplication(@Req() req:AuthenticatedRequest ,@Body() dto: VerifyPanDto) {
        return this.applicationsService.createApplication(
            req.user!.sub,
            dto.pan,
            dto.holderType,
        );
    }

    @Post(':id/phone/request-otp')
    requestPhoneOtp(
        @Param('id') id: string,
        @Body() dto: RequestPhoneOtpDto,
    ) {
        return this.applicationsService.requestPhoneOtp(
            Number(id),
            dto.phone,
        );
    }

    @Post(':id/phone/verify-otp')
    verifyPhoneOtp(
        @Param('id') id: string,
        @Body() dto: VerifyPhoneOtpDto,
    ) {
        return this.applicationsService.verifyPhoneOtp(
            Number(id),
            dto.otp,
        );
    }

    @Patch(':id/personal-details')
    updatePersonalDetails(
        @Param('id') id: string,
        @Body() dto: UpdatePersonalDetailsDto,
    ) {
        return this.applicationsService.updatePersonalDetails(
            Number(id),
            dto,
        );
    }

    @Post(':id/submit')
    submitApplication(
        @Param('id', ParseIntPipe) applicationId: number,
    ) {
        return this.applicationsService.submitApplication(applicationId);
    }
}