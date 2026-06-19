import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DEVICE_ICONS } from '../../subscriptions/device-icon';

export class AccountDeviceDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ example: 'Rastreador #1' })
  label?: string;

  @ApiProperty({
    enum: DEVICE_ICONS,
    example: 'vehicle',
  })
  icon: string;

  @ApiPropertyOptional({ example: '868123456789012' })
  device_id?: string;

  @ApiProperty({
    enum: ['pending_device', 'active', 'past_due', 'canceled'],
  })
  status: string;

  @ApiProperty()
  current_period_start: string;

  @ApiProperty()
  current_period_end: string;

  @ApiProperty({ example: 365 })
  period_days: number;

  @ApiProperty({ example: '1 ano' })
  period_label: string;

  @ApiProperty({ example: 312 })
  days_remaining: number;

  @ApiProperty()
  is_active: boolean;

  @ApiProperty()
  awaiting_activation: boolean;

  @ApiPropertyOptional()
  order_id?: string;

  @ApiPropertyOptional({ nullable: true })
  emergency_until?: string | null;

  @ApiProperty()
  emergency_active: boolean;

  @ApiProperty()
  emergency_remaining_sec: number;
}

export class AccountDevicesResponseDto {
  @ApiProperty({ type: [AccountDeviceDto] })
  devices: AccountDeviceDto[];
}

export class AccountOrderItemDto {
  @ApiProperty()
  product_slug: string;

  @ApiProperty()
  product_name: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  line_total_label: string;
}

export class AccountOrderDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  total_label: string;

  @ApiProperty()
  created_at: string;

  @ApiProperty({ type: [AccountOrderItemDto] })
  items: AccountOrderItemDto[];
}

export class AccountOrdersResponseDto {
  @ApiProperty({ type: [AccountOrderDto] })
  orders: AccountOrderDto[];
}
