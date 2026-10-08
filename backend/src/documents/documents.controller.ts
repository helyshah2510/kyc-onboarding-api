import { Controller, ParseIntPipe, Param, Post, UploadedFile, UseInterceptors,UseGuards,Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service.js';
import { ApiBody, ApiConsumes ,ApiBearerAuth} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/guard/jwt-auth.guard.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
        @Req() req:AuthenticatedRequest,
        @Param('id', ParseIntPipe) applicationId: number,
        @UploadedFile() file: Express.Multer.File,
    ) {
        return this.documentsService.uploadDocument(req.user!.sub,applicationId, file);
    }
}
