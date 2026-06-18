import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OptionalBearerGuard } from '../auth/optional-bearer.guard';
import { GeolocateDto, GeolocateResponseDto } from './dto/geolocate.dto';
import { GeolocationService } from './geolocation.service';

@ApiTags('geolocation')
@Controller('v1/geolocate')
@UseGuards(OptionalBearerGuard)
export class GeolocationController {
  constructor(private readonly geolocationService: GeolocationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Resolver posição por WiFi + torres celulares',
    description:
      'Recebe leituras de WiFi e células LTE do rastreador e consulta a Google Geolocation API.',
  })
  @ApiCreatedResponse({ type: GeolocateResponseDto })
  @ApiServiceUnavailableResponse({
    description: 'GOOGLE_GEOLOCATION_API_KEY não configurada',
  })
  @ApiBadGatewayResponse({ description: 'Falha na Google Geolocation API' })
  resolve(@Body() dto: GeolocateDto) {
    return this.geolocationService.resolve(dto);
  }
}
