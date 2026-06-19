import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
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
import { LatestLocationsQueryDto } from './dto/latest-locations-query.dto';
import {
  CreateLocationResponseDto,
  LatestLocationsResponseDto,
} from './dto/location-response.dto';
import { LocationsService } from './locations.service';
import { DevicesService } from '../devices/devices.service';

@ApiTags('locations')
@Controller('v1/locations')
@UseGuards(OptionalBearerGuard)
export class LocationsController {
  constructor(
    private readonly locationsService: LocationsService,
    private readonly devicesService: DevicesService,
  ) {}

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
  @ApiForbiddenResponse({
    description: 'Equipamento bloqueado — envio rejeitado',
  })
  async create(@Body() dto: CreateLocationDto) {
    const location = await this.locationsService.create(dto);
    const device = await this.devicesService.ensureExists(location.device_id);

    return {
      id: location.id,
      device_id: location.device_id,
      received_at: location.received_at.toISOString(),
      device_config: this.devicesService.getDeviceConfig(device),
    };
  }

  @Get('devices/:deviceId/latest')
  @ApiOperation({
    summary: 'Consultar últimas posições',
    description: `
Retorna posições de um equipamento, ordenadas da mais nova para a mais antiga.

Use \`limit\` (máx. 500) e os filtros \`from\`/\`to\` para montar histórico e rotas por dia.

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
  async latest(
    @Param('deviceId') deviceId: string,
    @Query() query: LatestLocationsQueryDto,
  ) {
    const locations = await this.locationsService.findLatestByDevice(deviceId, {
      limit: query.limit,
      from: query.from,
      to: query.to,
    });
    return { device_id: deviceId, locations };
  }
}
