import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty({ example: 'kit-tsim7080g' })
  slug: string;

  @ApiProperty({ example: 'Kit rastreador LT' })
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: ['hardware', 'subscription'] })
  type: string;

  @ApiProperty({ example: 47880, description: 'Preço em centavos' })
  price_cents: number;

  @ApiProperty({ example: 'R$ 478,80' })
  price_label: string;

  @ApiPropertyOptional({ example: 59880 })
  compare_at_price_cents?: number;

  @ApiPropertyOptional({ example: 'R$ 598,80' })
  compare_at_price_label?: string;

  @ApiPropertyOptional({ example: 'R$ 39,90' })
  monthly_price_label?: string;

  @ApiPropertyOptional({ example: 'R$ 49,90' })
  compare_at_monthly_label?: string;

  @ApiPropertyOptional({ example: 12 })
  included_months?: number;

  @ApiPropertyOptional({ example: 'Promoção de lançamento' })
  promo_label?: string;

  @ApiPropertyOptional({ example: 'R$ 25,90' })
  renewal_monthly_label?: string;

  @ApiPropertyOptional({ example: 30 })
  subscription_days?: number;
}

export class CheckoutResponseDto {
  @ApiProperty()
  order_id: string;

  @ApiProperty({ enum: ['pending', 'paid'] })
  status: string;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  redirect_to?: string;

  @ApiPropertyOptional()
  devices_created?: number;

  @ApiPropertyOptional({ type: [String] })
  subscription_ids?: string[];
}
