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
            document: {
                id: document.id,
                applicationId: document.applicationId,
                documentType: document.documentType,
                fileName: document.fileName,
                uploadedAt: document.uploadedAt,
            },
        };
    }
    // SHARED photocopier: no permission checks here, the caller must do them first
    async saveAdhaarFile(applicationId: number, file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('File is required');
        }

        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
        if (file.size > MAX_FILE_SIZE) {
            throw new BadRequestException('File size must not exceed 5 MB');
        }

        if (file.mimetype !== 'image/png') {
            throw new BadRequestException('Only PNG files are allowed');
        }

        // Validate PNG magic bytes signature: 89 50 4E 47 0D 0A 1A 0A
        const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
        const isRealPng =
            file.buffer &&
            file.buffer.length >= 8 &&
            pngSignature.every((byte, index) => file.buffer[index] === byte);

        if (!isRealPng) {
            throw new BadRequestException(
                'Invalid file content. The uploaded file is not a valid PNG image',
            );
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