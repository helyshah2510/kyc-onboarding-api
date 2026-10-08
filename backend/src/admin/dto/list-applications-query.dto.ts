import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListApplicationsQueryDto {
  @ApiPropertyOptional({
    enum: ApplicationStatus,
    description: 'Leave empty to see all applications',
  })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;
}