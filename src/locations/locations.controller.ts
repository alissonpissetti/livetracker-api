import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { OptionalBearerGuard } from '../auth/optional-bearer.guard';
import {
  createLocationFullExample,
  createLocationMinimalExample,
  latestLocationsExample,
} from '../swagger/location.examples';
import { CreateLocationDto } from './dto/create-location.dto';
import {
  CreateLocationResponseDto,
  LatestLocationsResponseDto,
} from './dto/location-response.dto';
import { LocationsService } from './locations.service';

@ApiTags('locations')
@Controller('v1/locations')
@UseGuards(OptionalBearerGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Enviar posição GPS',
    description: `
Registra uma nova posição enviada pelo rastreador.

**Campos obrigatórios:** \`device_id\`, \`latitude\`, \`longitude\`, \`recorded_at\`

**Resposta:** confirma o \`id\` gerado, o \`device_id\` e o horário de recebimento no servidor.
    `.trim(),
  })
  @ApiBody({
    type: CreateLocationDto,
    description:
      'Use o exemplo "Envio mínimo" para um teste rápido. O exemplo "Envio completo" inclui dados extras de GPS e modem.',
    examples: {
      minimo: {
        summary: 'Envio mínimo',
        description: 'Apenas os campos obrigatórios — ideal para começar',
        value: createLocationMinimalExample,
      },
      completo: {
        summary: 'Envio completo',
        description: 'Inclui altitude, satélites e dados do chip celular',
        value: createLocationFullExample,
      },
    },
  })
  @ApiCreatedResponse({
    type: CreateLocationResponseDto,
    description: 'Posição armazenada com sucesso',
  })
  async create(@Body() dto: CreateLocationDto) {
    const location = await this.locationsService.create(dto);

    return {
      id: location.id,
      device_id: location.device_id,
      received_at: location.received_at.toISOString(),
    };
  }

  @Get('devices/:deviceId/latest')
  @ApiOperation({
    summary: 'Consultar últimas posições',
    description: `
Retorna as **20 posições mais recentes** de um equipamento, ordenadas da mais nova para a mais antiga.

\`deviceId\` é normalmente o **IMEI** do rastreador (mesmo valor de \`device_id\` no envio).
    `.trim(),
  })
  @ApiParam({
    name: 'deviceId',
    description: 'Identificador do equipamento (geralmente IMEI)',
    example: '868123456789012',
  })
  @ApiOkResponse({
    type: LatestLocationsResponseDto,
    description: 'Lista das últimas posições registradas',
    schema: { example: latestLocationsExample },
  })
  async latest(@Param('deviceId') deviceId: string) {
    const locations = await this.locationsService.findLatestByDevice(deviceId);
    return { device_id: deviceId, locations };
  }
}
