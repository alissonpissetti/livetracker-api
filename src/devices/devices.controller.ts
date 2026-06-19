import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { OptionalBearerGuard } from '../auth/optional-bearer.guard';
import { DeviceConfigDto } from './dto/device-config.dto';
import { DevicesService } from './devices.service';

@ApiTags('devices')
@Controller('v1/devices')
@UseGuards(OptionalBearerGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get(':deviceId/config')
  @ApiOperation({
    summary: 'Configuração remota do rastreador',
    description:
      'Consultado periodicamente pelo firmware para modo emergência e intervalos de envio.',
  })
  @ApiParam({
    name: 'deviceId',
    description: 'Identificador do equipamento (geralmente IMEI)',
    example: '868123456789012',
  })
  @ApiOkResponse({ type: DeviceConfigDto })
  async getConfig(@Param('deviceId') deviceId: string): Promise<DeviceConfigDto> {
    const device = await this.devicesService.ensureExists(deviceId);
    return this.devicesService.getDeviceConfig(device);
  }
}
