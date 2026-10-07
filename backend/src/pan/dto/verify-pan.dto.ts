import { Transform } from 'class-transformer';
import { IsIn, IsString, Matches } from 'class-validator';
import { HOLDER_TYPE_VALUES, PAN_PATTERN } from '../pan.constants.js';
import type { HolderType } from '../pan.constants.js';

export class VerifyPanDto {
    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim().toUpperCase() : value,
    )
    @IsString()
    @Matches(PAN_PATTERN, { message: 'Invalid PAN format' })
    pan: string;

    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim().toLowerCase() : value,
    )
    @IsIn(HOLDER_TYPE_VALUES)
    holderType: HolderType;
}