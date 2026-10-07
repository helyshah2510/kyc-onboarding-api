import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsString, Matches } from 'class-validator';
import { HOLDER_TYPE_VALUES, PAN_PATTERN } from '../pan.constants.js';
import type { HolderType } from '../pan.constants.js';

export class VerifyPanDto {
    @ApiProperty({ example: 'ABCPE1234F', description: 'A PAN that exists in the seed data' })
    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim().toUpperCase() : value,
    )
    @IsString()
    @Matches(PAN_PATTERN, { message: 'Invalid PAN format' })
    pan: string;

    @ApiProperty({ enum: HOLDER_TYPE_VALUES, example: 'individual' })
    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim().toLowerCase() : value,
    )
    @IsIn(HOLDER_TYPE_VALUES)
    holderType: HolderType;
}