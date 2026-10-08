import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PanService } from '../pan/pan.service.js';
import type { HolderType } from '../pan/pan.constants.js';
import { UpdatePersonalDetailsDto } from './dto/update-personal-details.dto.js';

@Injectable()
export class ApplicationsService {
    constructor(
        private prisma: PrismaService,
        private panService: PanService,
    ) { }

    // Finds the application AND checks it belongs to this user
    private async getOwnedApplication(applicationId: number, userId: number) {
        const application = await this.prisma.kycApplication.findUnique({
            where: { id: applicationId },
        });
        if (!application || application.userId !== userId) {
            throw new NotFoundException('Application not found');
        }
        return application;
    }

    // Same check, and the application must still be changeable by the user
    private async getEditableApplication(applicationId: number, userId: number) {
        const application = await this.getOwnedApplication(applicationId, userId);
        if (application.status !== 'DRAFT' && application.status !== 'REJECTED') {
            throw new BadRequestException(
                `This application can no longer be changed (current status: ${application.status})`,
            );
        }
        return application;
    }

    async createApplication(userId: number, pan: string, holderType: HolderType) {
        const panResult = await this.panService.validatePan(pan, holderType);

        if (!panResult.verified) {
            return {
                success: false,
                message: panResult.reason,
            };
        }

        return this.prisma.kycApplication.create({
            data: {
                userId,
                pan,
                name: panResult.name!,
                phone: panResult.phone!,
                address: panResult.address!,
                holderType: panResult.holder!,
                status: 'DRAFT',
            },
        });
    }

    // ---- the user's own applications ----

    listMine(userId: number) {
        return this.prisma.kycApplication.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                pan: true,
                name: true,
                status: true,
                rejectionReason: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }

    getMine(userId: number, applicationId: number) {
        return this.getOwnedApplication(applicationId, userId);
    }

    // ---- editing (only DRAFT or REJECTED) ----

    async requestPhoneOtp(userId: number, applicationId: number, phone: string) {
        const application = await this.getEditableApplication(applicationId, userId);

        if (application.phone === phone) {
            return {
                success: false,
                message: 'This phone number is already associated with the application',
            };
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await this.prisma.phoneOtp.create({
            data: {
                applicationId,
                phone,
                otp,
                expiresAt,
            },
        });

        console.log(`OTP for ${phone}: ${otp}`);

        return {
            success: true,
            message: 'OTP sent successfully',
        };
    }

    async verifyPhoneOtp(userId: number, applicationId: number, otp: string) {
        await this.getEditableApplication(applicationId, userId);

        const otpRecord = await this.prisma.phoneOtp.findFirst({
            where: {
                applicationId,
                otp,
                verified: false,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        if (!otpRecord) {
            return {
                success: false,
                message: 'Invalid OTP',
            };
        }

        if (otpRecord.expiresAt < new Date()) {
            return {
                success: false,
                message: 'OTP has expired',
            };
        }

        await this.prisma.$transaction([
            this.prisma.kycApplication.update({
                where: { id: applicationId },
                data: { phone: otpRecord.phone },
            }),
            this.prisma.phoneOtp.update({
                where: { id: otpRecord.id },
                data: { verified: true },
            }),
        ]);

        return {
            success: true,
            message: 'Phone number verified successfully',
        };
    }

    async updatePersonalDetails(
        userId: number,
        applicationId: number,
        dto: UpdatePersonalDetailsDto,
    ) {
        await this.getEditableApplication(applicationId, userId);

        return this.prisma.kycApplication.update({
            where: { id: applicationId },
            data: { address: dto.address },
        });
    }

    // ---- "Complete application" ----
    // DRAFT    -> VERIFIED   (first time)
    // REJECTED -> SUBMITTED  (sent back after a fix, reason cleared)

    async submitApplication(userId: number, applicationId: number) {
        const application = await this.getEditableApplication(applicationId, userId);

        const document = await this.prisma.kycDocument.findFirst({
            where: {
                applicationId,
                documentType: 'AADHAAR',
            },
        });

        if (!document) {
            return {
                success: false,
                message: 'Aadhaar document is required before submitting KYC',
            };
        }

        const wasRejected = application.status === 'REJECTED';

        const updatedApplication = await this.prisma.kycApplication.update({
            where: { id: applicationId },
            data: {
                status: wasRejected ? 'SUBMITTED' : 'VERIFIED',
                rejectionReason: null,
            },
        });

        return {
            success: true,
            message: wasRejected
                ? 'KYC resubmitted successfully'
                : 'KYC submitted successfully',
            application: updatedApplication,
        };
    }
}