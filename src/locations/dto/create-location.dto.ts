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
  @IsString()
  @IsNotEmpty()
  device_id: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @IsNumber()
  altitude?: number;

  @IsOptional()
  @IsNumber()
  speed_knots?: number;

  @IsOptional()
  @IsNumber()
  accuracy_m?: number;

  @IsOptional()
  @IsNumber()
  satellites_visible?: number;

  @IsOptional()
  @IsNumber()
  satellites_used?: number;

  @IsOptional()
  @IsString()
  imei?: string;

  @IsOptional()
  @IsString()
  iccid?: string;

  @IsOptional()
  @IsString()
  imsi?: string;

  @IsOptional()
  @IsString()
  operator?: string;

  @IsOptional()
  @IsString()
  apn?: string;

  @IsISO8601({ strict: true })
  recorded_at: string;
}
