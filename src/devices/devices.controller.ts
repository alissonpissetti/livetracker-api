import { Controller, Get, HttpCode, HttpStatus, Param, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { OptionalBearerGuard } from '../auth/optional-bearer.guard';
import { DeviceConfigDto } from './dto/device-config.dto';
import { DeviceRegistryResponseDto } from './dto/update-device-registry.dto';
import { UpdateDeviceRegistryDto } from './dto/update-device-registry.dto';
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
      'Consultado periodicamente pelo firmware para intervalos de envio e PIN de SMS.',
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

  @Post(':deviceId/registry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Registrar dados do chip/modem',
    description:
      'Recebe o número do chip (MSISDN) e identificadores do modem para habilitar SMS de comando ao equipamento.',
  })
  @ApiParam({
    name: 'deviceId',
    description: 'Identificador do equipamento (geralmente IMEI)',
    example: '868123456789012',
  })
  @ApiCreatedResponse({ type: DeviceRegistryResponseDto })
  async register(
    @Param('deviceId') deviceId: string,
    @Body() dto: UpdateDeviceRegistryDto,
  ): Promise<DeviceRegistryResponseDto> {
    const device = await this.devicesService.registerFromDevice(deviceId, dto);
    return {
      device_id: device.device_id,
      sim_msisdn: device.sim_msisdn ?? null,
      updated_at: device.last_seen_at.toISOString(),
    };
  }
}
