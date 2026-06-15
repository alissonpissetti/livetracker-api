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
import { OptionalBearerGuard } from '../auth/optional-bearer.guard';
import { CreateLocationDto } from './dto/create-location.dto';
import { LocationsService } from './locations.service';

@Controller('v1/locations')
@UseGuards(OptionalBearerGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateLocationDto) {
    const location = await this.locationsService.create(dto);

    return {
      id: location.id,
      device_id: location.device_id,
      received_at: location.received_at.toISOString(),
    };
  }

  @Get('devices/:deviceId/latest')
  async latest(@Param('deviceId') deviceId: string) {
    const locations = await this.locationsService.findLatestByDevice(deviceId);
    return { device_id: deviceId, locations };
  }
}
