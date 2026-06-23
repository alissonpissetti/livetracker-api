import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DevicesService } from '../devices/devices.service';
import { DeviceAlertsService } from '../device-alerts/device-alerts.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { Location } from './entities/location.entity';
import {
  findInvalidLocationIndices,
  impliedSpeedKmh,
  isInvalidComparedToPrevious,
} from './location-quality.util';
import { collapseNearbyLocations } from './location-collapse.util';

const MAX_INCREMENTAL_LOCATIONS = 500;
const MAX_TAIL_LOCATIONS = 500;
const MAX_FULL_DAY_LOCATIONS = 10_000;

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationsRepository: Repository<Location>,
    private readonly devicesService: DevicesService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly deviceAlertsService: DeviceAlertsService,
  ) {}

  async create(dto: CreateLocationDto): Promise<Location> {
    const device = await this.devicesService.assertCanReceiveLocations(
      dto.device_id,
    );

    await this.subscriptionsService.assertDeviceCanTrack(dto.device_id);

    const recentValid = await this.findRecentValidLocations(dto.device_id);
    const lastValid = recentValid[0] ?? null;
    const recentSpeeds = this.recentSegmentSpeeds(recentValid);
    const is_valid =
      lastValid == null ||
      !isInvalidComparedToPrevious(
        {
          id: lastValid.id,
          latitude: lastValid.latitude,
          longitude: lastValid.longitude,
          recorded_at: lastValid.recorded_at,
          speed_knots: lastValid.speed_knots,
          location_source: lastValid.location_source,
        },
        {
          id: '',
          latitude: dto.latitude,
          longitude: dto.longitude,
          recorded_at: dto.recorded_at,
          speed_knots: dto.speed_knots,
          location_source: dto.location_source,
        },
        recentSpeeds,
      );

    const location = this.locationsRepository.create({
      ...dto,
      is_valid,
    });
    const saved = await this.locationsRepository.save(location);

    if (is_valid) {
      await this.devicesService.touchFromLocation(device, dto);
    }

    if (dto.battery_percent != null) {
      await this.deviceAlertsService.processBatteryReading(
        device,
        dto.battery_percent,
      );
    }

    if (
      dto.battery_percent != null ||
      dto.usb_connected != null ||
      dto.battery_charging != null
    ) {
      await this.devicesService.updatePowerFromReading(device, dto);
    } else if (dto.battery_percent != null) {
      await this.devicesService.saveBatteryAlertState(device);
    }

    if (dto.sim_msisdn) {
      await this.devicesService.updateSimMsisdn(device, dto.sim_msisdn);
    }

    return saved;
  }

  async findLatestByDevice(
    deviceId: string,
    options: { limit?: number; from?: string; to?: string } = {},
  ): Promise<Location[]> {
    const locations = await this.findByDevice(deviceId, { ...options, order: 'desc' });
    const ascending = [...locations].reverse();
    return collapseNearbyLocations(ascending).reverse();
  }

  async findRouteByDevice(
    deviceId: string,
    options: {
      limit?: number;
      from?: string;
      to?: string;
      since?: string;
      full?: boolean;
    } = {},
  ): Promise<Location[]> {
    let locations: Location[];

    if (options.since) {
      const limit = Math.min(
        Math.max(options.limit ?? MAX_INCREMENTAL_LOCATIONS, 1),
        MAX_INCREMENTAL_LOCATIONS,
      );
      locations = await this.findByDevice(deviceId, {
        limit,
        from: new Date(new Date(options.since).getTime() + 1).toISOString(),
        to: options.to,
        order: 'asc',
      });
    } else if (options.full) {
      locations = await this.findAllInRangeAscending(deviceId, options);
    } else {
      const limit = Math.min(
        Math.max(options.limit ?? MAX_TAIL_LOCATIONS, 1),
        MAX_TAIL_LOCATIONS,
      );
      locations = await this.findRecentTailAscending(deviceId, options, limit);
    }

    if (locations.length >= 2) {
      await this.reconcileValidityFlags(locations);
      const reconciled = await this.fetchLocationsByIdsAscending(
        locations.map((location) => location.id),
      );
      return collapseNearbyLocations(reconciled);
    }

    return collapseNearbyLocations(locations);
  }

  private async findAllInRangeAscending(
    deviceId: string,
    options: { from?: string; to?: string },
  ): Promise<Location[]> {
    const query = this.locationsRepository
      .createQueryBuilder('location')
      .where('location.device_id = :deviceId', { deviceId })
      .orderBy('location.recorded_at', 'ASC')
      .addOrderBy('location.received_at', 'ASC')
      .take(MAX_FULL_DAY_LOCATIONS);

    if (options.from) {
      query.andWhere('location.received_at >= :from', {
        from: new Date(options.from),
      });
    }

    if (options.to) {
      query.andWhere('location.received_at <= :to', {
        to: new Date(options.to),
      });
    }

    return query.getMany();
  }

  private async findRecentTailAscending(
    deviceId: string,
    options: { from?: string; to?: string },
    limit: number,
  ): Promise<Location[]> {
    const query = this.locationsRepository
      .createQueryBuilder('location')
      .where('location.device_id = :deviceId', { deviceId });

    if (options.from) {
      query.andWhere('location.received_at >= :from', {
        from: new Date(options.from),
      });
    }

    if (options.to) {
      query.andWhere('location.received_at <= :to', {
        to: new Date(options.to),
      });
    }

    const recentDesc = await query
      .clone()
      .orderBy('location.recorded_at', 'DESC')
      .addOrderBy('location.received_at', 'DESC')
      .take(limit)
      .getMany();

    return recentDesc.reverse();
  }

  private async fetchLocationsByIdsAscending(ids: string[]): Promise<Location[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.locationsRepository
      .createQueryBuilder('location')
      .whereInIds(ids)
      .orderBy('location.recorded_at', 'ASC')
      .addOrderBy('location.received_at', 'ASC')
      .getMany();
  }

  private async findRecentValidLocations(
    deviceId: string,
    limit = 12,
  ): Promise<Location[]> {
    return this.locationsRepository
      .createQueryBuilder('location')
      .where('location.device_id = :deviceId', { deviceId })
      .andWhere('location.is_valid = :isValid', { isValid: true })
      .orderBy('location.recorded_at', 'DESC')
      .addOrderBy('location.received_at', 'DESC')
      .take(limit)
      .getMany();
  }

  private recentSegmentSpeeds(recentValidDesc: Location[]): number[] {
    const speeds: number[] = [];
    for (let index = 0; index < recentValidDesc.length - 1; index += 1) {
      const newer = recentValidDesc[index];
      const older = recentValidDesc[index + 1];
      speeds.push(
        impliedSpeedKmh(
          {
            id: older.id,
            latitude: older.latitude,
            longitude: older.longitude,
            recorded_at: older.recorded_at,
            speed_knots: older.speed_knots,
            location_source: older.location_source,
          },
          {
            id: newer.id,
            latitude: newer.latitude,
            longitude: newer.longitude,
            recorded_at: newer.recorded_at,
            speed_knots: newer.speed_knots,
            location_source: newer.location_source,
          },
        ),
      );
    }
    return speeds;
  }

  private async reconcileValidityFlags(locations: Location[]): Promise<void> {
    const invalidIndices = findInvalidLocationIndices(
      locations.map((location) => ({
        id: location.id,
        latitude: location.latitude,
        longitude: location.longitude,
        recorded_at: location.recorded_at,
        speed_knots: location.speed_knots,
        location_source: location.location_source,
      })),
    );
    const toInvalidate: string[] = [];
    const toValidate: string[] = [];

    locations.forEach((location, index) => {
      const shouldBeValid = !invalidIndices.has(index);
      if (location.is_valid !== shouldBeValid) {
        if (shouldBeValid) {
          toValidate.push(location.id);
        } else {
          toInvalidate.push(location.id);
        }
      }
    });

    if (toInvalidate.length > 0) {
      await this.locationsRepository.update(
        { id: In(toInvalidate) },
        { is_valid: false },
      );
    }

    if (toValidate.length > 0) {
      await this.locationsRepository.update(
        { id: In(toValidate) },
        { is_valid: true },
      );
    }
  }

  private async findByDevice(
    deviceId: string,
    options: {
      limit?: number;
      from?: string;
      to?: string;
      order?: 'asc' | 'desc';
    } = {},
  ): Promise<Location[]> {
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 500);
    const order = options.order === 'asc' ? 'ASC' : 'DESC';

    const query = this.locationsRepository
      .createQueryBuilder('location')
      .where('location.device_id = :deviceId', { deviceId })
      .orderBy('location.recorded_at', order)
      .addOrderBy('location.received_at', order)
      .take(limit);

    if (options.from) {
      query.andWhere('location.received_at >= :from', {
        from: new Date(options.from),
      });
    }

    if (options.to) {
      query.andWhere('location.received_at <= :to', {
        to: new Date(options.to),
      });
    }

    return query.getMany();
  }
}
