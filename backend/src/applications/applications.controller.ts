import {Body,Controller,Get,Param,Post,Patch,ParseIntPipe,UseGuards,Req,} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ApplicationsService } from './applications.service.js';
import { VerifyPanDto } from '../pan/dto/verify-pan.dto.js';
import { RequestPhoneOtpDto } from './dto/request-phone-otp.dto.js';
import { VerifyPhoneOtpDto } from './dto/verify-phone-otp.dto.js';
import { UpdatePersonalDetailsDto } from './dto/update-personal-details.dto.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/guard/jwt-auth.guard.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationsController {
    constructor(private readonly applicationsService: ApplicationsService) { }

    @Post()
    createApplication(
        @Req() req: AuthenticatedRequest,
        @Body() dto: VerifyPanDto,
    ) {
        return this.applicationsService.createApplication(
            req.user!.sub,
            dto.pan,
            dto.holderType,
        );
    }

    @Get()
    listMine(@Req() req: AuthenticatedRequest) {
        return this.applicationsService.listMine(req.user!.sub);
    }

    @Get(':id')
    getOne(
        @Req() req: AuthenticatedRequest,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.applicationsService.getMine(req.user!.sub, id);
    }

    @Post(':id/phone/request-otp')
    requestPhoneOtp(
        @Req() req: AuthenticatedRequest,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: RequestPhoneOtpDto,
    ) {
        return this.applicationsService.requestPhoneOtp(req.user!.sub, id, dto.phone);
    }

    @Post(':id/phone/verify-otp')
    verifyPhoneOtp(
        @Req() req: AuthenticatedRequest,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: VerifyPhoneOtpDto,
    ) {
        return this.applicationsService.verifyPhoneOtp(req.user!.sub, id, dto.otp);
    }

    @Patch(':id/personal-details')
    updatePersonalDetails(
        @Req() req: AuthenticatedRequest,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdatePersonalDetailsDto,
    ) {
        return this.applicationsService.updatePersonalDetails(req.user!.sub, id, dto);
    }

    @Post(':id/submit')
    submitApplication(
        @Req() req: AuthenticatedRequest,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.applicationsService.submitApplication(req.user!.sub, id);
    }
}