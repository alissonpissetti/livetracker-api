import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLocationDto } from './dto/create-location.dto';
import { Location } from './entities/location.entity';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationsRepository: Repository<Location>,
  ) {}

  async create(dto: CreateLocationDto): Promise<Location> {
    const location = this.locationsRepository.create(dto);
    return this.locationsRepository.save(location);
  }

  async findLatestByDevice(deviceId: string, limit = 20): Promise<Location[]> {
    return this.locationsRepository.find({
      where: { device_id: deviceId },
      order: { received_at: 'DESC' },
      take: limit,
    });
  }
}
