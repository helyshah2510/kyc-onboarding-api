import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PanModule } from './pan/pan.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ApplicationsModule } from './applications/applications.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { AuthModule } from './auth/auth.module.js';

@Module({
  imports: [PanModule, PrismaModule, ApplicationsModule, DocumentsModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
