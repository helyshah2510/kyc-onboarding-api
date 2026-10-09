import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { DocumentsModule } from '../documents/documents.module.js';

@Module({
  imports:[DocumentsModule],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}
