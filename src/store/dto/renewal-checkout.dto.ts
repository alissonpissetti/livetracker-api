import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export const RENEWAL_PLAN_SLUGS = ['renovacao-6-meses', 'renovacao-12-meses'] as const;
export type RenewalPlanSlug = (typeof RENEWAL_PLAN_SLUGS)[number];

export class RenewalCheckoutDto {
  @ApiProperty({ description: 'ID do slot/equipamento na conta' })
  @IsUUID()
  subscription_id: string;

  @ApiProperty({ enum: RENEWAL_PLAN_SLUGS, example: 'renovacao-6-meses' })
  @IsString()
  @IsNotEmpty()
  @IsIn(RENEWAL_PLAN_SLUGS)
  plan_slug: RenewalPlanSlug;
}
