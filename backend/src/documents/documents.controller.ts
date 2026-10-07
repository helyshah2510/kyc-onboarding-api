import { Controller, ParseIntPipe, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service.js';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';

@Controller('applications')
export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) { }

    @Post(':id/documents')
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    })
    @UseInterceptors(FileInterceptor('file'))
    uploadDocument(
        @Param('id', ParseIntPipe) applicationId: number,
        @UploadedFile() file: Express.Multer.File,
    ) {
        return this.documentsService.uploadDocument(applicationId, file);
    }
}
