import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';

@Injectable()
export class DocumentsService {
    constructor(private readonly prisma: PrismaService) { }

    //user counter checks who you are and whether  the application is editable or not 
    async uploadDocument(
        userId: number,
        applicationId: number,
        file: Express.Multer.File,
    ) {
        // Does this application exist AND belong to the logged-in user?
        const application = await this.prisma.kycApplication.findUnique({
            where: { id: applicationId },
        });

        if (!application || application.userId !== userId) {
            throw new NotFoundException('Application not found');
        }

        // Only DRAFT or REJECTED applications can be changed
        if (application.status !== 'DRAFT' && application.status !== 'REJECTED') {
            throw new BadRequestException(
                `This application can no longer be changed (current status: ${application.status})`,
            );
        }

        const document = await this.saveAdhaarFile(applicationId, file);
        return {
            success: true,
            message: 'Document uploaded successfully',
            document,
        };
    }
    // SHARED photocopier: no permission checks here, the caller must do them first
    async saveAdhaarFile(applicationId: number, file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('File is required');
        }

        if (file.mimetype !== 'image/png') {
            throw new BadRequestException('Only PNG files are allowed');
        }

        const existingDocument = await this.prisma.kycDocument.findFirst({
            where: {
                applicationId,
                documentType: 'AADHAAR',
            },
        });

        const fileName = `aadhaar-${Date.now()}.png`;
        const uploadDir = join(process.cwd(), 'uploads');

        await mkdir(uploadDir, { recursive: true });

        const filePath = join(uploadDir, fileName);

        // Save the new physical file first
        await writeFile(filePath, file.buffer);

        if (existingDocument) {
            // Remove the old physical file
            try {
                await unlink(existingDocument.filePath);
            } catch (error: any) {
                if (error.code !== 'ENOENT') {
                    throw error;
                }
            }

            // Update the existing database row
            return this.prisma.kycDocument.update({
                where: { id: existingDocument.id },
                data: {
                    fileName,
                    filePath,
                    uploadedAt: new Date(),
                },
            });
        }
        // No Aadhaar exists yet, so create the first row
        return this.prisma.kycDocument.create({
            data: {
                applicationId,
                documentType: 'AADHAAR',
                fileName,
                filePath,
            },
        });
    }
}