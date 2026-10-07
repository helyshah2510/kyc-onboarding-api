import { Controller, ParseIntPipe, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service.js';

@Controller('applications')
export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) { }

    @Post(':id/documents')
    @UseInterceptors(FileInterceptor('file'))
    uploadDocument(
        @Param('id', ParseIntPipe) applicationId: number,
        @UploadedFile() file: Express.Multer.File,
    ) {
        return this.documentsService.uploadDocument(applicationId, file);
    }
}
