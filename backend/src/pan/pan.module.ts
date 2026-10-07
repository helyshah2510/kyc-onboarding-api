import { Module } from '@nestjs/common';
import { PanController } from './pan.controller.js';
import { PanService } from './pan.service.js';
import { PanVerificationService } from './pan-verification.service.js';

@Module({
  controllers: [PanController],
  providers: [PanService,PanVerificationService],
  exports:[PanService],
})
export class PanModule {}
