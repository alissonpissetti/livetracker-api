import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { databaseEntities } from './entities';
import {
  buildMariaDbPoolExtraFromEnv,
  resolveDbConnectionFromProcessEnv,
} from './typeorm.config';

loadEnv();

const driver = (process.env.DB_DRIVER ?? 'mariadb').toLowerCase();

function buildDataSource(): DataSource {
  if (driver === 'sqlite') {
    return new DataSource({
      type: 'sqlite',
      database: process.env.DATABASE_PATH ?? ':memory:',
      entities: [...databaseEntities],
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      synchronize: false,
    });
  }

  const info = resolveDbConnectionFromProcessEnv();

  const connectTimeoutMs = Number(process.env.DB_CONNECT_TIMEOUT_MS ?? 30_000);

  return new DataSource({
    type: 'mariadb',
    host: info.host,
    port: info.port,
    username: info.username,
    password: info.password,
    database: info.database,
    entities: [...databaseEntities],
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    synchronize: false,
    connectTimeout: connectTimeoutMs,
    extra: buildMariaDbPoolExtraFromEnv(),
  });
}

export const AppDataSource = buildDataSource();
