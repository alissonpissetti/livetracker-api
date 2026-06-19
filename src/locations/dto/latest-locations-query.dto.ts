import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class LatestLocationsQueryDto {
  @ApiPropertyOptional({
    description: 'Quantidade máxima de posições retornadas.',
    default: 20,
    minimum: 1,
    maximum: 500,
    example: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filtra posições com received_at maior ou igual a este instante (ISO 8601).',
    example: '2026-06-10T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description:
      'Polling incremental: retorna posições recebidas após este instante (ISO 8601), em ordem cronológica.',
    example: '2026-06-10T14:30:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  since?: string;

  @ApiPropertyOptional({
    description:
      'Histórico do dia: retorna todas as posições no intervalo from/to (até 10.000), em ordem cronológica.',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  full?: boolean;

  @ApiPropertyOptional({
    description: 'Filtra posições com received_at menor ou igual a este instante (ISO 8601).',
    example: '2026-06-10T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
