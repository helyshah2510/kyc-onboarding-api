import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface PanRecord {
  pan: string;
  name: string;
  phone: string;
  address: string;
  holderType: string;
}

export interface PanVerificationResult {
  verified: boolean;
  details: PanRecord | null;
  reason: string | null;
}

@Injectable()
export class PanVerificationService {
  constructor(private readonly prisma: PrismaService) {}

  async findPanRecord(pan: string): Promise<PanVerificationResult> {
    const record = await this.prisma.panProviderRecord.findUnique({
      where: { pan },
    });

    if (!record) {
      return { verified: false, details: null, reason: 'KYC record not found' };
    }

    return { verified: true, details: record, reason: null };
  }
}