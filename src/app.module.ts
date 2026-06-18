import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountModule } from './account/account.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { createTypeOrmConfig } from './database/typeorm.config';
import { DevicesModule } from './devices/devices.module';
import { GeolocationModule } from './geolocation/geolocation.module';
import { HealthController } from './health/health.controller';
import { LocationsModule } from './locations/locations.module';
import { StoreModule } from './store/store.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createTypeOrmConfig(config),
    }),
    UsersModule,
    AuthModule,
    AccountModule,
    AdminModule,
    LocationsModule,
    GeolocationModule,
    DevicesModule,
    StoreModule,
    SubscriptionsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
