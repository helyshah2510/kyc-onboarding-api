import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PanModule } from './pan/pan.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ApplicationsModule } from './applications/applications.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module.js';

@Module({
  imports: [ ConfigModule.forRoot({ isGlobal: true }), PanModule, PrismaModule, ApplicationsModule, DocumentsModule, AuthModule, AdminModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
