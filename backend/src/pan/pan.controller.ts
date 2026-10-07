import { Body, Controller, Post } from '@nestjs/common';
import { PanService } from './pan.service.js';
import { VerifyPanDto } from './dto/verify-pan.dto.js';

@Controller('pan')
export class PanController {
  constructor(private readonly panService: PanService) {}

  @Post('validate')
  validatePan(@Body() dto: VerifyPanDto) {
    return this.panService.validatePan(dto.pan, dto.holderType);
  }
}