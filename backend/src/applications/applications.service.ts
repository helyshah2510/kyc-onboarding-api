import { Injectable } from '@nestjs/common';
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

    async createApplication(pan: string, holderType: HolderType) {
        const panResult = await this.panService.validatePan(
            pan,
            holderType,
        );

        if (!panResult.verified) {
            return {
                success: false,
                message: panResult.reason,
            };
        }

        const application = await this.prisma.kycApplication.create({
            data: {
                pan,
                name: panResult.name!,
                phone: panResult.phone!,
                address: panResult.address!,
                holderType: panResult.holder!,
                status: 'VERIFIED',
            },
        });

        return application;
    }

    async requestPhoneOtp(applicationId: number, phone: string) {
        const application = await this.prisma.kycApplication.findUnique({
            where: { id: applicationId },
        });

        if (!application) {
            return {
                success: false,
                message: 'Application not found',
            };
        }

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

    async verifyPhoneOtp(applicationId: number, otp: string) {
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
                data: {
                    phone: otpRecord.phone,
                },
            }),

            this.prisma.phoneOtp.update({
                where: { id: otpRecord.id },
                data: {
                    verified: true,
                },
            }),
        ]);

        return {
            success: true,
            message: 'Phone number verified successfully',
        };
    }

    async updatePersonalDetails(
        applicationId: number,
        dto: UpdatePersonalDetailsDto,
    ) {
        const application = await this.prisma.kycApplication.findUnique({
            where: { id: applicationId },
        });

        if (!application) {
            return {
                success: false,
                message: 'Application not found',
            };
        }

        const updatedApplication =
            await this.prisma.kycApplication.update({
                where: { id: applicationId },
                data: {
                    address: dto.address,
                },
            });

        return updatedApplication;
    }

    async submitApplication(applicationId: number) {
        const application = await this.prisma.kycApplication.findUnique({
            where: {
                id: applicationId,
            },
        });

        if (!application) {
            return {
                success: false,
                message: 'Application not found',
            };
        }

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

        const updatedApplication =
            await this.prisma.kycApplication.update({
                where: {
                    id: applicationId,
                },
                data: {
                    status: 'SUBMITTED',
                },
            });

        return {
            success: true,
            message: 'KYC submitted successfully',
            application: updatedApplication,
        };
    }
}