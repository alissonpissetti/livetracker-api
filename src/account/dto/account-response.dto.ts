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

  @ApiProperty()
  alert_battery_low_enabled: boolean;

  @ApiProperty()
  alert_battery_full_enabled: boolean;

  @ApiPropertyOptional({ description: 'Última leitura de bateria (%)' })
  last_battery_percent?: number | null;

  @ApiPropertyOptional({ description: 'USB-C conectado na última leitura' })
  last_usb_connected?: boolean | null;

  @ApiPropertyOptional({ description: 'Bateria em carga na última leitura' })
  last_battery_charging?: boolean | null;

  @ApiPropertyOptional({ description: 'Quando a telemetria de energia foi atualizada' })
  last_power_at?: string | null;

  @ApiPropertyOptional({
    description: 'Número do chip no equipamento, quando conhecido',
  })
  sim_msisdn?: string | null;

  @ApiPropertyOptional({
    description: 'PIN de 6 dígitos para validar SMS de comando no equipamento',
    example: '482913',
    nullable: true,
  })
  sms_command_pin?: string | null;
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
