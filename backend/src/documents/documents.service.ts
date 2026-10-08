import { Injectable,NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';

@Injectable()
export class DocumentsService {
    constructor(private readonly prisma: PrismaService) { }

    async uploadDocument(
        userId:number,
        applicationId: number,
        file: Express.Multer.File,
    ) {
        // Does this application exist AND belong to the logged-in user?
        const application = await this.prisma.kycApplication.findUnique({
            where: {
                id: applicationId,
            },
        });

        if (!application || application.userId!==userId) {
            throw new NotFoundException('Application not found');
        }

        if (!file) {
            return {
                success: false,
                message: 'File is required',
            };
        }

        if (file.mimetype !== 'image/png') {
            return {
                success: false,
                message: 'Only PNG files are allowed',
            };
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

        let document;

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
            document = await this.prisma.kycDocument.update({
                where: {
                    id: existingDocument.id,
                },
                data: {
                    fileName,
                    filePath,
                    uploadedAt: new Date(),
                },
            });
        } else {
            // No Aadhaar exists yet, so create the first row
            document = await this.prisma.kycDocument.create({
                data: {
                    applicationId,
                    documentType: 'AADHAAR',
                    fileName,
                    filePath,
                },
            });
        }

        return {
            success: true,
            message: 'Document uploaded successfully',
            document,
        };
    }
}