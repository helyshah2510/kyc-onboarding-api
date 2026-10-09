import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { DocumentsModule } from '../documents/documents.module.js';
import { NotificationsService } from './notifications/notifications.service.js';

@Module({
  imports:[DocumentsModule],
  controllers: [AdminController],
  providers: [AdminService,NotificationsService]
})
export class AdminModule {}
