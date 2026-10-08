import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PanService } from './pan.service.js';
import { VerifyPanDto } from './dto/verify-pan.dto.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('pan')
export class PanController {
  constructor(private readonly panService: PanService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('validate')
  validatePan(@Body() dto: VerifyPanDto) {
    return this.panService.validatePan(dto.pan, dto.holderType);
  }
}