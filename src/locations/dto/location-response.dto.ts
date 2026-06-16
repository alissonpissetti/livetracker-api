import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { latestLocationsExample } from '../../swagger/location.examples';

export class CreateLocationResponseDto {
  @ApiProperty({
    description: 'Identificador único da posição salva no banco.',
    example: 'cdf6b5de-08d5-4e24-854e-04dcf7d405f5',
  })
  id: string;

  @ApiProperty({
    description: 'IMEI ou identificador do equipamento.',
    example: '868123456789012',
  })
  device_id: string;

  @ApiProperty({
    description: 'Momento em que o servidor recebeu o envio (ISO 8601).',
    example: '2026-06-15T22:30:00.000Z',
  })
  received_at: string;
}

export class LocationRecordDto {
  @ApiProperty({ example: 'cdf6b5de-08d5-4e24-854e-04dcf7d405f5' })
  id: string;

  @ApiProperty({ example: '868123456789012' })
  device_id: string;

  @ApiProperty({ example: -23.5505199 })
  latitude: number;

  @ApiProperty({ example: -46.6333094 })
  longitude: number;

  @ApiPropertyOptional({ example: 760.5 })
  altitude?: number;

  @ApiPropertyOptional({ example: 0 })
  speed_knots?: number;

  @ApiPropertyOptional({ example: 3.5 })
  accuracy_m?: number;

  @ApiPropertyOptional({ example: 12 })
  satellites_visible?: number;

  @ApiPropertyOptional({ example: 8 })
  satellites_used?: number;

  @ApiPropertyOptional({ example: '868123456789012' })
  imei?: string;

  @ApiPropertyOptional({ example: '89550123456789012345' })
  iccid?: string;

  @ApiPropertyOptional({ example: '724051234567890' })
  imsi?: string;

  @ApiPropertyOptional({ example: 'Vivo' })
  operator?: string;

  @ApiPropertyOptional({ example: 'm2m.vivo.com.br' })
  apn?: string;

  @ApiProperty({ example: '2026-06-15T18:30:00Z' })
  recorded_at: string;

  @ApiProperty({ example: '2026-06-15T18:30:01.234Z' })
  received_at: Date;
}

export class LatestLocationsResponseDto {
  @ApiProperty({
    description: 'IMEI ou identificador consultado.',
    example: latestLocationsExample.device_id,
  })
  device_id: string;

  @ApiProperty({
    type: [LocationRecordDto],
    description: 'Até 20 posições, da mais recente para a mais antiga.',
    example: latestLocationsExample.locations,
  })
  locations: LocationRecordDto[];
}
