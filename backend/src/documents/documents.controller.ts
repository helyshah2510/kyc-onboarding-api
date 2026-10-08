import { Controller, ParseIntPipe, Param, Post, UploadedFile, UseInterceptors,UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service.js';
import { ApiBody, ApiConsumes ,ApiBearerAuth} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';

@ApiBearerAuth()
@Controller('applications')
export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) { }

    @UseGuards(JwtAuthGuard)
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
