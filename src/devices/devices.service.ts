import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'crypto';
import { Repository } from 'typeorm';
import { normalizeBrCellphone, normalizeSimMsisdn } from '../lib/phone-br';
import { CreateLocationDto } from '../locations/dto/create-location.dto';
import { DEVICE_CONFIG } from './device-config.constants';
import { DeviceConfigDto } from './dto/device-config.dto';
import { BlockDeviceDto } from './dto/block-device.dto';
import { Device } from './entities/device.entity';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

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

  async findHardwareForSubscription(deviceId?: string | null): Promise<Device | null> {
    return this.findByDeviceIdOptional(deviceId);
  }

  getDeviceConfig(device: Device): DeviceConfigDto {
    return {
      report_interval_sec: DEVICE_CONFIG.REPORT_INTERVAL_MOVING_SEC,
      config_poll_interval_sec: DEVICE_CONFIG.CONFIG_POLL_INTERVAL_SEC,
      stop_distance_m: DEVICE_CONFIG.STOP_DISTANCE_M,
      stop_samples_required: DEVICE_CONFIG.STOP_SAMPLES_REQUIRED,
      sms_command_pin: device.sms_command_pin ?? '',
    };
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

  async updatePowerFromReading(
    device: Device,
    dto: Pick<CreateLocationDto, 'battery_percent' | 'usb_connected' | 'battery_charging'>,
  ): Promise<Device> {
    let changed = false;

    if (dto.battery_percent != null && Number.isFinite(dto.battery_percent)) {
      device.last_battery_percent = Math.round(dto.battery_percent);
      changed = true;
    }

    if (dto.usb_connected != null) {
      device.last_usb_connected = dto.usb_connected;
      changed = true;
    }

    if (dto.battery_charging != null) {
      device.last_battery_charging = dto.battery_charging;
      changed = true;
    }

    if (!changed) {
      return device;
    }

    device.last_power_at = new Date();
    return this.devicesRepository.save(device);
  }

  async saveBatteryAlertState(device: Device): Promise<Device> {
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
      return this.ensureSmsCommandPin(existing);
    }

    const device = this.devicesRepository.create({
      device_id: normalized,
      sms_command_pin: this.generateSmsCommandPin(),
    });
    return this.devicesRepository.save(device);
  }

  async ensureSmsCommandPin(device: Device): Promise<Device> {
    if (device.sms_command_pin?.length) {
      return device;
    }

    device.sms_command_pin = this.generateSmsCommandPin();
    return this.devicesRepository.save(device);
  }

  async updateSimMsisdn(device: Device, rawMsisdn?: string | null): Promise<Device> {
    const normalized = rawMsisdn ? normalizeSimMsisdn(rawMsisdn) : null;
    if (!normalized) {
      if (rawMsisdn?.trim()) {
        throw new BadRequestException(
          'Número do chip inválido. Use DDD + número, ex: (11) 98765-4321',
        );
      }
      return device;
    }
    if (normalized === device.sim_msisdn) {
      return device;
    }

    device.sim_msisdn = normalized;
    this.logger.log(
      `Número SIM do equipamento ${device.device_id} atualizado (****${normalized.slice(-4)})`,
    );
    return this.devicesRepository.save(device);
  }

  async registerFromDevice(
    deviceId: string,
    dto: {
      sim_msisdn?: string;
      imei?: string;
      iccid?: string;
      imsi?: string;
      operator?: string;
      battery_percent?: number;
      usb_connected?: boolean;
      battery_charging?: boolean;
    },
  ): Promise<Device> {
    let device = await this.assertCanReceiveLocations(deviceId);

    if (dto.sim_msisdn) {
      try {
        device = await this.updateSimMsisdn(device, dto.sim_msisdn);
      } catch (error) {
        if (error instanceof BadRequestException) {
          this.logger.warn(
            `MSISDN inválido ignorado no registry de ${deviceId}: ${dto.sim_msisdn}`,
          );
        } else {
          throw error;
        }
      }
    }

    if (
      dto.battery_percent != null ||
      dto.usb_connected != null ||
      dto.battery_charging != null
    ) {
      device = await this.updatePowerFromReading(device, dto);
    }

    device.last_seen_at = new Date();
    return this.devicesRepository.save(device);
  }

  private generateSmsCommandPin(): string {
    return String(randomInt(100000, 1000000));
  }
}
