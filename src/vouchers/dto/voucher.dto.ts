import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CheckoutItemDto } from '../../store/dto/checkout.dto';

export class CreateVoucherDto {
  @ApiProperty({ example: 'LIVE10' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  code: string;

  @ApiProperty({ enum: ['percent', 'fixed'] })
  @IsIn(['percent', 'fixed'])
  discount_type: 'percent' | 'fixed';

  @ApiProperty({
    example: 10,
    description: 'Percentual (1–100) ou valor fixo em centavos',
  })
  @IsInt()
  @Min(1)
  discount_value: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  max_uses?: number;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  expires_at?: string;

  @ApiPropertyOptional({ example: 44900, description: 'Pedido mínimo em centavos' })
  @IsOptional()
  @IsInt()
  @Min(0)
  min_order_cents?: number;

  @ApiPropertyOptional({ example: '10% na primeira compra' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateVoucherDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class VoucherPreviewDto {
  @ApiProperty({ example: 'LIVE10' })
  @IsString()
  @IsNotEmpty()
  voucher_code: string;

  @ApiProperty({ type: [CheckoutItemDto] })
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  @ArrayMinSize(1)
  items: CheckoutItemDto[];

  @ApiPropertyOptional({ enum: ['pix', 'card'], example: 'pix' })
  @IsOptional()
  @IsIn(['pix', 'creditCard'])
  payment_method?: 'pix' | 'creditCard';
}
