import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { HealthController } from './health/health.controller';
import { Location } from './locations/entities/location.entity';
import { LocationsModule } from './locations/locations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const database = config.get<string>(
          'DATABASE_PATH',
          'data/livetracker.sqlite',
        );

        if (database !== ':memory:') {
          mkdirSync(dirname(database), { recursive: true });
        }

        return {
          type: 'sqlite',
          database,
          entities: [Location],
          synchronize: true,
        };
      },
    }),
    LocationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
