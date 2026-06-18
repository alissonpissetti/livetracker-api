import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsMACAddress,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class GeolocateCellTowerDto {
  @ApiProperty({ example: 187212754, description: 'ECI / Cell ID (LTE)' })
  @IsNumber()
  @Min(0)
  cellId: number;

  @ApiPropertyOptional({ example: 23265, description: 'TAC (LTE) ou LAC' })
  @IsOptional()
  @IsInt()
  @Min(0)
  locationAreaCode?: number;

  @ApiProperty({ example: 724, description: 'MCC' })
  @IsInt()
  @Min(1)
  mobileCountryCode: number;

  @ApiProperty({ example: 6, description: 'MNC' })
  @IsInt()
  @Min(0)
  mobileNetworkCode: number;

  @ApiPropertyOptional({ example: 0, description: 'Idade da leitura em segundos' })
  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;

  @ApiPropertyOptional({ example: -95, description: 'RSRP/RSSI em dBm' })
  @IsOptional()
  @IsInt()
  @Max(0)
  signalStrength?: number;
}

export class GeolocateWifiApDto {
  @ApiProperty({ example: '00:11:22:33:44:55' })
  @IsMACAddress()
  macAddress: string;

  @ApiPropertyOptional({ example: -65, description: 'RSSI em dBm' })
  @IsOptional()
  @IsInt()
  @Max(0)
  signalStrength?: number;
}

export class GeolocateDto {
  @ApiPropertyOptional({ enum: ['lte', 'gsm', 'nr'], default: 'lte' })
  @IsOptional()
  @IsIn(['lte', 'gsm', 'nr'])
  radioType?: 'lte' | 'gsm' | 'nr';

  @ApiPropertyOptional({ example: 724 })
  @IsOptional()
  @IsInt()
  homeMobileCountryCode?: number;

  @ApiPropertyOptional({ example: 6 })
  @IsOptional()
  @IsInt()
  homeMobileNetworkCode?: number;

  @ApiProperty({ type: [GeolocateCellTowerDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(16)
  @ValidateNested({ each: true })
  @Type(() => GeolocateCellTowerDto)
  cellTowers: GeolocateCellTowerDto[];

  @ApiPropertyOptional({ type: [GeolocateWifiApDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => GeolocateWifiApDto)
  wifiAccessPoints?: GeolocateWifiApDto[];
}

export class GeolocateResponseDto {
  @ApiProperty({ example: -25.434726 })
  latitude: number;

  @ApiProperty({ example: -49.273123 })
  longitude: number;

  @ApiProperty({ example: 42.5, description: 'Raio de incerteza em metros' })
  accuracy_m: number;
}
