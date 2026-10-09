import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApplicationStatus } from '@prisma/client';
import { access, unlink } from 'node:fs/promises';
import { DocumentsService } from '../documents/documents.service.js';
import { NotificationsService } from './notifications/notifications.service.js';
import { AuditService } from './audit-log/audit.service.js';

@Injectable()
export class AdminService {
    constructor(
        private prisma: PrismaService,
        private documentsServicce: DocumentsService,
        private notificationsService: NotificationsService,
        private auditService: AuditService,
    ) { }

    // only verified and SUBMITTED applications can be reviewed
    private async getReviewableApplication(id: number) {
        const application = await this.prisma.kycApplication.findUnique({
            where: { id },
            include: { user: { select: { name: true, email: true, phone: true } } }
        });
        if (!application) {
            throw new NotFoundException('Application not found');
        }
        if (application.status !== 'VERIFIED' && application.status !== 'SUBMITTED') {
            throw new BadRequestException(
                `Only verified and submitted applications can be reviewed (current status: ${application.status})`,
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

    async getAadhaarDocument(applicationId: number) {
        const document = await this.prisma.kycDocument.findFirst({
            where: { applicationId, documentType: 'AADHAAR' },
        });
        if (!document) {
            throw new NotFoundException('No Aadhaar image found for this application');
        }

        // The database says a file exists, but is it really on disk?
        try {
            await access(document.filePath);
        } catch {
            throw new NotFoundException('Image file is missing on the server');
        }

        return document;
    }

    async approve(id: number, adminId: number) {
        const application = await this.getReviewableApplication(id);
        const updated = await this.prisma.kycApplication.update({
            where: { id },
            data: { status: 'APPROVED', rejectionReason: null },
        });
        await this.auditService.record(adminId, 'APPLICATION_APPROVED', id, {
            previousStatus: application.status,
        });

        this.notificationsService.send(
            application.user,
            'your Kyc application has been approved',
        )
        return updated;
    }

    async reject(id: number, reason: string, adminId: number) {
        const application = await this.getReviewableApplication(id);
        const updated = await this.prisma.kycApplication.update({
            where: { id },
            data: { status: 'REJECTED', rejectionReason: reason },
        });

        await this.auditService.record(adminId, 'APPLICATION_REJECTED', id, {
            previousStatus: application.status,
        })

        this.notificationsService.send(
            application.user,
            'your Kyc application has been rejected reason ${reason}',
        );
        return updated;
    }

    async updateAddress(id: number, address: string, adminId: number) {
        const application = await this.getReviewableApplication(id);
        const newAddress = address.trim();
        const updated = await this.prisma.kycApplication.update({
            where: { id },
            data: { address },
        });
        await this.auditService.record(adminId, 'ADDRESS_UPDATED', id,{
            oldAddress: application.address,
            newAddress,
        });
        return updated;
    }

    async replaceDocuments(id: number, file: Express.Multer.File, adminId: number) {
        await this.getReviewableApplication(id);
        const document = await this.documentsServicce.saveAdhaarFile(id, file);
        await this.auditService.record(adminId, 'DOCUMENT_REPLACED', id, {
            newFileName: document.fileName,
        });
        return {
            message: 'Document replaced successfully',
            document,
        };
    }

    async deleteApplication(id: number, adminId: number) {
        const application = await this.prisma.kycApplication.findUnique({
            where: { id },
            include: { kycDocuments: true },
        });
        if (!application) {
            throw new NotFoundException('Application not found');
        }
        //1. Database first, all or nothing
        await this.prisma.$transaction([
            this.prisma.phoneOtp.deleteMany({ where: { applicationId: id } }),
            this.prisma.kycDocument.deleteMany({ where: { applicationId: id } }),
            this.prisma.kycApplication.deleteMany({ where: { id } }),
        ]);

        await this.auditService.record(adminId, 'APPLICATION_DELETED', id, {
            pan: application.pan,
            previousStatus: application.status,
        });

        //2. Files only after the database succeded
        for (const document of application.kycDocuments) {
            try {
                await unlink(document.filePath);
            } catch (error: any) {
                if (error.code !== 'ENOENT') {
                    throw error;
                }
            }
        }

        return { message: 'Application deleted successfully' };
    }
}