import { Injectable } from '@nestjs/common';
import { PanVerificationService } from './pan-verification.service.js';
import { HOLDER_TYPES } from './pan.constants.js';
import type { HolderType } from './pan.constants.js';

export interface PanValidationResult {
  valid: boolean;
  verified: boolean;
  holder: HolderType | null;
  name: string | null;
  phone: string | null;
  address: string | null;
  reason: string | null;
}

@Injectable()
export class PanService {
  constructor(
    private readonly panVerificationService: PanVerificationService,
  ) { }

  async validatePan(
    pan: string,
    selectedHolderType: HolderType,
  ): Promise<PanValidationResult> {
    // The 4th letter of a PAN tells us the holder type
    const letter = pan[3] as keyof typeof HOLDER_TYPES;
    const holder = HOLDER_TYPES[letter];

    if (!holder) {
      return this.fail('Unknown holder type');
    }

    if (holder !== selectedHolderType) {
      return this.fail('Holder type does not match PAN', holder);
    }

    const result = await this.panVerificationService.findPanRecord(pan);

    return {
      valid: true,
      verified: result.verified,
      holder,
      name: result.details?.name ?? null,
      phone: result.details?.phone ?? null,
      address: result.details?.address ?? null,
      reason: result.reason,
    };
  }

  private fail(
    reason: string,
    holder: HolderType | null = null,
  ): PanValidationResult {
    return {
      valid: false,
      verified: false,
      holder,
      name: null,
      phone: null,
      address: null,
      reason,
    };
  }
}