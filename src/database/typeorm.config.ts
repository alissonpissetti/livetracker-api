import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Location } from '../locations/entities/location.entity';

function buildMariaDbConfig(config: ConfigService): TypeOrmModuleOptions {
  return {
    type: 'mariadb',
    host: config.get<string>('DB_HOST', 'localhost'),
    port: config.get<number>('DB_PORT', 3306),
    username: config.get<string>('DB_USER', 'root'),
    password: config.get<string>('DB_PASSWORD', ''),
    database: config.get<string>('DB_NAME', 'default'),
    entities: [Location],
    synchronize: config.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
    connectTimeout: 30000,
  };
}

function buildSqliteConfig(database: string): TypeOrmModuleOptions {
  return {
    type: 'sqlite',
    database,
    entities: [Location],
    synchronize: true,
  };
}

export function createTypeOrmConfig(
  config: ConfigService,
): TypeOrmModuleOptions {
  const driver = config.get<string>('DB_DRIVER', 'mariadb').toLowerCase();

  if (driver === 'sqlite') {
    return buildSqliteConfig(
      config.get<string>('DATABASE_PATH', ':memory:'),
    );
  }

  return buildMariaDbConfig(config);
}
