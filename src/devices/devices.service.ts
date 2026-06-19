import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLocationDto } from '../locations/dto/create-location.dto';
import { DEVICE_CONFIG } from './device-config.constants';
import { DeviceConfigDto } from './dto/device-config.dto';
import { BlockDeviceDto } from './dto/block-device.dto';
import { Device } from './entities/device.entity';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private readonly devicesRepository: Repository<Device>,
  ) {}

  async findAll(): Promise<Device[]> {
    return this.devicesRepository.find({
      order: { last_seen_at: 'DESC' },
    });
  }

  async findByDeviceId(deviceId: string): Promise<Device> {
    const device = await this.devicesRepository.findOne({
      where: { device_id: deviceId },
    });

    if (!device) {
      throw new NotFoundException(`Equipamento ${deviceId} não encontrado`);
    }

    return device;
  }

  async findByDeviceIdOptional(deviceId?: string | null): Promise<Device | null> {
    if (!deviceId) {
      return null;
    }

    return this.devicesRepository.findOne({
      where: { device_id: deviceId.trim() },
    });
  }

  isEmergencyActive(device: Device): boolean {
    return !!device.emergency_until && device.emergency_until.getTime() > Date.now();
  }

  async normalizeEmergency(device: Device | null): Promise<Device | null> {
    if (!device?.emergency_until) {
      return device;
    }

    if (this.isEmergencyActive(device)) {
      return device;
    }

    device.emergency_until = null;
    device.emergency_activated_at = null;
    return this.devicesRepository.save(device);
  }

  async findHardwareForSubscription(deviceId?: string | null): Promise<Device | null> {
    if (!deviceId) {
      return null;
    }

    const device = await this.findByDeviceIdOptional(deviceId);
    return this.normalizeEmergency(device);
  }

  getDeviceConfig(device: Device): DeviceConfigDto {
    const emergencyActive = this.isEmergencyActive(device);

    return {
      mode: emergencyActive ? 'emergency' : 'normal',
      emergency_until: emergencyActive
        ? device.emergency_until!.toISOString()
        : null,
      report_interval_sec: emergencyActive
        ? DEVICE_CONFIG.REPORT_INTERVAL_EMERGENCY_SEC
        : DEVICE_CONFIG.REPORT_INTERVAL_MOVING_SEC,
      config_poll_interval_sec: DEVICE_CONFIG.CONFIG_POLL_INTERVAL_SEC,
      stop_distance_m: DEVICE_CONFIG.STOP_DISTANCE_M,
      stop_samples_required: DEVICE_CONFIG.STOP_SAMPLES_REQUIRED,
    };
  }

  getEmergencyState(device: Device | null): {
    emergency_until: string | null;
    emergency_active: boolean;
    emergency_remaining_sec: number;
  } {
    if (!device?.emergency_until) {
      return {
        emergency_until: null,
        emergency_active: false,
        emergency_remaining_sec: 0,
      };
    }

    const remainingMs = device.emergency_until.getTime() - Date.now();
    if (remainingMs <= 0) {
      return {
        emergency_until: null,
        emergency_active: false,
        emergency_remaining_sec: 0,
      };
    }

    const maxRemainingSec = DEVICE_CONFIG.EMERGENCY_DURATION_MS / 1000;
    const remainingSec = Math.min(Math.ceil(remainingMs / 1000), maxRemainingSec);

    return {
      emergency_until: device.emergency_until.toISOString(),
      emergency_active: true,
      emergency_remaining_sec: remainingSec,
    };
  }

  async activateEmergency(deviceId: string): Promise<Device> {
    const device = await this.ensureExists(deviceId);
    const now = new Date();

    device.emergency_activated_at = now;
    device.emergency_until = new Date(
      now.getTime() + DEVICE_CONFIG.EMERGENCY_DURATION_MS,
    );

    return this.devicesRepository.save(device);
  }

  async deactivateEmergency(deviceId: string): Promise<Device> {
    const device = await this.ensureExists(deviceId);

    device.emergency_until = null;
    device.emergency_activated_at = null;

    return this.devicesRepository.save(device);
  }

  async assertCanReceiveLocations(deviceId: string): Promise<Device> {
    const device = await this.ensureExists(deviceId);

    if (device.blocked) {
      throw new ForbiddenException(
        `Equipamento ${deviceId} está bloqueado e não pode enviar localizações`,
      );
    }

    return device;
  }

  async touchFromLocation(
    device: Device,
    dto: CreateLocationDto,
  ): Promise<Device> {
    device.last_latitude = dto.latitude;
    device.last_longitude = dto.longitude;
    device.last_location_source = dto.location_source;
    return this.devicesRepository.save(device);
  }

  async block(deviceId: string, dto: BlockDeviceDto): Promise<Device> {
    const device = await this.ensureExists(deviceId);

    device.blocked = true;
    device.blocked_at = new Date();
    device.blocked_reason = dto.reason?.trim() || undefined;

    return this.devicesRepository.save(device);
  }

  async unblock(deviceId: string): Promise<Device> {
    const device = await this.findByDeviceId(deviceId);

    device.blocked = false;
    device.blocked_at = undefined;
    device.blocked_reason = undefined;

    return this.devicesRepository.save(device);
  }

  async ensureExists(deviceId: string): Promise<Device> {
    const normalized = deviceId.trim();
    const existing = await this.devicesRepository.findOne({
      where: { device_id: normalized },
    });

    if (existing) {
      return existing;
    }

    const device = this.devicesRepository.create({ device_id: normalized });
    return this.devicesRepository.save(device);
  }
}
