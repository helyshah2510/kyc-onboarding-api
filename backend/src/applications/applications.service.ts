import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PanService } from '../pan/pan.service.js';
import type { HolderType } from '../pan/pan.constants.js';
import { UpdatePersonalDetailsDto } from './dto/update-personal-details.dto.js';
import { randomInt } from 'node:crypto';
import bcrypt from 'bcrypt';

const MAX_PHONE_OTP_ATTEMPTS = 5;
const phoneOtpAttempts = new Map<number, number>();

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
            include: {
                kycDocuments: {
                    select: {
                        id: true,
                        documentType: true,
                        fileName: true,
                        uploadedAt: true,
                    },
                },
            },
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
        const existingApplications= await this.prisma.kycApplication.findFirst({
            where:{
                userId,
                pan:pan.trim().toUpperCase(),
                status:{
                    not:'REJECTED',
                },
            },
        });

        if(existingApplications){
            throw  new BadRequestException('this application already exist');
        }

        if (!panResult.verified) {
            throw new BadRequestException(
                panResult.reason ?? 'PAN verification failed',
            );
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
            throw new BadRequestException(
                'This phone number is already associated with the application',
            );
        }

        const otp = randomInt(100000, 1000000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await this.prisma.phoneOtp.create({
            data: {
                applicationId,
                phone,
                otp: otpHash,
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
                verified: false,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        if (!otpRecord) {
            throw new BadRequestException('No pending OTP found. Please request a new one');
        }

        if (otpRecord.expiresAt < new Date()) {
            phoneOtpAttempts.delete(otpRecord.id);
            throw new BadRequestException('OTP has expired');
        }

        const currentAttempts = phoneOtpAttempts.get(otpRecord.id) ?? 0;
        if (currentAttempts >= MAX_PHONE_OTP_ATTEMPTS) {
            throw new BadRequestException(
                'Too many wrong attempts. Please request a new OTP',
            );
        }

        const isCorrect = await bcrypt.compare(otp, otpRecord.otp);
        if (!isCorrect) {
            const nextAttempts = currentAttempts + 1;
            phoneOtpAttempts.set(otpRecord.id, nextAttempts);
            if (nextAttempts >= MAX_PHONE_OTP_ATTEMPTS) {
                throw new BadRequestException(
                    'Too many wrong attempts. Please request a new OTP',
                );
            }
            const left = MAX_PHONE_OTP_ATTEMPTS - nextAttempts;
            throw new BadRequestException(
                `Invalid OTP. ${left} attempt${left === 1 ? '' : 's'} left`,
            );
        }

        phoneOtpAttempts.delete(otpRecord.id);

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
            throw new BadRequestException(
                'Aadhaar document is required before submitting KYC',
            );
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