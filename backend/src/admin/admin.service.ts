import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApplicationStatus } from '@prisma/client';

@Injectable()
export class AdminService {
    constructor(private prisma: PrismaService) { }

    // only SUBMITTED applications can be reviewed
    private async getReviewableApplication(id: number) {
        const application = await this.prisma.kycApplication.findUnique({
            where: { id },
        });
        if (!application) {
            throw new NotFoundException('Application not found');
        }
        if (application.status !== 'SUBMITTED') {
            throw new BadRequestException(
                `Only submitted applications can be reviewed (current status: ${application.status})`,
            );
        }
        return application;
    }

    listApplications(status?: ApplicationStatus) {
        return this.prisma.kycApplication.findMany({
            where: status ? { status } : {},
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                pan: true,
                status: true,
                createdAt: true,
                user: { select: { id: true, name: true, email: true } },
            },
        });
    }

    async getApplication(id: number) {
        const application = await this.prisma.kycApplication.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, name: true, email: true, phone: true } },
                kycDocuments: {
                    select: { id: true, documentType: true, fileName: true, uploadedAt: true },
                },
            },
        });
        if (!application) {
            throw new NotFoundException('Application not found');
        }
        return application;
    }

    async approve(id: number) {
        await this.getReviewableApplication(id);
        return this.prisma.kycApplication.update({
            where: { id },
            data: { status: 'APPROVED', rejectionReason: null },
        });
    }

    async reject(id: number, reason: string) {
        await this.getReviewableApplication(id);
        return this.prisma.kycApplication.update({
            where: { id },
            data: { status: 'REJECTED', rejectionReason: reason },
        });
    }
}