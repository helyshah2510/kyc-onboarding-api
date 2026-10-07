import { Module } from '@nestjs/common';
import { ApplicationsController } from './applications.controller.js';
import { ApplicationsService } from './applications.service.js';
import { PanModule } from '../pan/pan.module.js';

@Module({
  imports:[PanModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService]
})
export class ApplicationsModule {}
