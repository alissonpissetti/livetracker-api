import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Location } from '../locations/entities/location.entity';

export interface DbConnectionInfo {
  host: string;
  port: number;
  username: string;
  database: string;
  source: 'DATABASE_URL' | 'DB_*';
}

function parseDatabaseUrl(url: string) {
  const parsed = new URL(url);

  return {
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    username: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, '') || 'default',
  };
}

export function resolveDbConnectionInfo(
  config: ConfigService,
): DbConnectionInfo & { password: string } {
  const databaseUrl = config.get<string>('DATABASE_URL', '').trim();

  if (databaseUrl) {
    const parsed = parseDatabaseUrl(databaseUrl);
    return { ...parsed, source: 'DATABASE_URL' };
  }

  return {
    host: config.get<string>('DB_HOST', 'localhost'),
    port: Number(config.get<string>('DB_PORT', '3306')),
    username: config.get<string>('DB_USER', 'root'),
    password: config.get<string>('DB_PASSWORD', ''),
    database: config.get<string>('DB_NAME', 'default'),
    source: 'DB_*',
  };
}

export function logDbConnectionTarget(config: ConfigService): void {
  const info = resolveDbConnectionInfo(config);

  console.log(
    `[DB] Alvo: ${info.host}:${info.port}/${info.database} (user: ${info.username}, origem: ${info.source})`,
  );

  if (info.host === 'localhost' || info.host === '127.0.0.1') {
    console.warn(
      '[DB] AVISO: DB_HOST=localhost — em Docker/Coolify configure DATABASE_URL ou DB_HOST no painel',
    );
  }

  if (!info.password) {
    console.warn('[DB] AVISO: senha do banco vazia (DB_PASSWORD / DATABASE_URL)');
  }
}

function buildMariaDbConfig(config: ConfigService): TypeOrmModuleOptions {
  const info = resolveDbConnectionInfo(config);

  return {
    type: 'mariadb',
    host: info.host,
    port: info.port,
    username: info.username,
    password: info.password,
    database: info.database,
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

  logDbConnectionTarget(config);
  return buildMariaDbConfig(config);
}
