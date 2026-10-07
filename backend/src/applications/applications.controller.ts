import { Body, Controller, Param, Post, Patch,ParseIntPipe } from '@nestjs/common';
import { ApplicationsService } from './applications.service.js';
import { VerifyPanDto } from '../pan/dto/verify-pan.dto.js';
import { RequestPhoneOtpDto } from './dto/request-phone-otp.dto.js';
import { VerifyPhoneOtpDto } from './dto/verify-phone-otp.dto.js';
import { UpdatePersonalDetailsDto } from './dto/update-personal-details.dto.js';

@Controller('applications')
export class ApplicationsController {
    constructor(private readonly applicationsService: ApplicationsService) { }

    @Post()
    createApplication(@Body() dto: VerifyPanDto) {
        return this.applicationsService.createApplication(
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