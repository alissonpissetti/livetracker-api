import { Module } from '@nestjs/common';
import { OptionalBearerGuard } from '../auth/optional-bearer.guard';
import { GeolocationController } from './geolocation.controller';
import { GeolocationService } from './geolocation.service';

@Module({
  controllers: [GeolocationController],
  providers: [GeolocationService, OptionalBearerGuard],
})
export class GeolocationModule {}
