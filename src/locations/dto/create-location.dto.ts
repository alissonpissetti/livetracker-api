import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateLocationDto {
  @ApiProperty({
    description: '**Obrigatório.** Identificador do equipamento — normalmente o IMEI do modem.',
    example: '868123456789012',
  })
  @IsString()
  @IsNotEmpty()
  device_id: string;

  @ApiProperty({
    description: '**Obrigatório.** Latitude em graus decimais (WGS84).',
    example: -23.5505199,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    description: '**Obrigatório.** Longitude em graus decimais (WGS84).',
    example: -46.6333094,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({
    description: '**Obrigatório.** Momento em que o GPS registrou a posição (ISO 8601, UTC).',
    example: '2026-06-15T18:30:00Z',
  })
  @IsISO8601({ strict: true })
  recorded_at: string;

  @ApiPropertyOptional({
    description: 'Altitude em metros acima do nível do mar.',
    example: 760.5,
  })
  @IsOptional()
  @IsNumber()
  altitude?: number;

  @ApiPropertyOptional({
    description: 'Velocidade em nós (knots).',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  speed_knots?: number;

  @ApiPropertyOptional({
    description: 'Precisão horizontal estimada do GPS, em metros.',
    example: 3.5,
  })
  @IsOptional()
  @IsNumber()
  accuracy_m?: number;

  @ApiPropertyOptional({
    description: 'Quantidade de satélites visíveis pelo receptor.',
    example: 12,
  })
  @IsOptional()
  @IsNumber()
  satellites_visible?: number;

  @ApiPropertyOptional({
    description: 'Quantidade de satélites usados no cálculo da posição.',
    example: 8,
  })
  @IsOptional()
  @IsNumber()
  satellites_used?: number;

  @ApiPropertyOptional({
    description: 'IMEI do modem (pode repetir o device_id).',
    example: '868123456789012',
  })
  @IsOptional()
  @IsString()
  imei?: string;

  @ApiPropertyOptional({
    description: 'ICCID do chip SIM.',
    example: '89550123456789012345',
  })
  @IsOptional()
  @IsString()
  iccid?: string;

  @ApiPropertyOptional({
    description: 'IMSI da operadora.',
    example: '724051234567890',
  })
  @IsOptional()
  @IsString()
  imsi?: string;

  @ApiPropertyOptional({
    description: 'Nome da operadora celular.',
    example: 'Vivo',
  })
  @IsOptional()
  @IsString()
  operator?: string;

  @ApiPropertyOptional({
    description: 'APN usado na conexão de dados.',
    example: 'm2m.vivo.com.br',
  })
  @IsOptional()
  @IsString()
  apn?: string;
}
