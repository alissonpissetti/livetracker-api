import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { databaseEntities } from './entities';

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

export function resolveDbConnectionFromProcessEnv(
  env: NodeJS.ProcessEnv = process.env,
): DbConnectionInfo & { password: string } {
  const databaseUrl = (env.DATABASE_URL ?? '').trim();

  if (databaseUrl) {
    const parsed = parseDatabaseUrl(databaseUrl);
    return { ...parsed, source: 'DATABASE_URL' };
  }

  return {
    host: env.DB_HOST ?? 'localhost',
    port: Number(env.DB_PORT ?? '3306'),
    username: env.DB_USER ?? 'root',
    password: env.DB_PASSWORD ?? '',
    database: env.DB_NAME ?? 'default',
    source: 'DB_*',
  };
}

export function resolveDbConnectionInfo(
  config: ConfigService,
): DbConnectionInfo & { password: string } {
  return resolveDbConnectionFromProcessEnv({
    DATABASE_URL: config.get<string>('DATABASE_URL', '').trim(),
    DB_HOST: config.get<string>('DB_HOST', 'localhost'),
    DB_PORT: config.get<string>('DB_PORT', '3306'),
    DB_USER: config.get<string>('DB_USER', 'root'),
    DB_PASSWORD: config.get<string>('DB_PASSWORD', ''),
    DB_NAME: config.get<string>('DB_NAME', 'default'),
  });
}

function migrationPaths(): string[] {
  return [__dirname + '/migrations/*{.ts,.js}'];
}

function readDbFlags(config: ConfigService) {
  return {
    synchronize: config.get<string>('DB_SYNCHRONIZE', 'false') === 'true',
    migrationsRun: config.get<string>('DB_MIGRATE', 'true') === 'true',
    logging: config.get<string>('DB_LOGGING', 'false') === 'true',
  };
}

function readDbPoolNumber(
  config: ConfigService,
  key: string,
  fallback: number,
): number {
  const raw = config.get<string>(key, String(fallback)).trim();
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Opções do pool mysql2 — evita ETIMEDOUT em conexões ociosas (NAT / wait_timeout). */
export function buildMariaDbPoolExtra(
  config: ConfigService,
): Record<string, unknown> {
  const connectionLimit = readDbPoolNumber(config, 'DB_POOL_SIZE', 10);
  const idleTimeoutMs = readDbPoolNumber(config, 'DB_POOL_IDLE_MS', 45_000);
  const connectTimeoutMs = readDbPoolNumber(
    config,
    'DB_CONNECT_TIMEOUT_MS',
    30_000,
  );

  return {
    connectionLimit,
    waitForConnections: true,
    queueLimit: 0,
    maxIdle: connectionLimit,
    idleTimeout: idleTimeoutMs,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    connectTimeout: connectTimeoutMs,
  };
}

export function buildMariaDbPoolExtraFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): Record<string, unknown> {
  const read = (key: string, fallback: number) => {
    const raw = (env[key] ?? String(fallback)).trim();
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  const connectionLimit = read('DB_POOL_SIZE', 10);

  return {
    connectionLimit,
    waitForConnections: true,
    queueLimit: 0,
    maxIdle: connectionLimit,
    idleTimeout: read('DB_POOL_IDLE_MS', 45_000),
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    connectTimeout: read('DB_CONNECT_TIMEOUT_MS', 30_000),
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
  const flags = readDbFlags(config);

  console.log(
    `[DB] Modo: synchronize=${flags.synchronize}, migrationsRun=${flags.migrationsRun}`,
  );

  const connectTimeoutMs = readDbPoolNumber(
    config,
    'DB_CONNECT_TIMEOUT_MS',
    30_000,
  );

  return {
    type: 'mariadb',
    host: info.host,
    port: info.port,
    username: info.username,
    password: info.password,
    database: info.database,
    entities: [...databaseEntities],
    migrations: migrationPaths(),
    synchronize: flags.synchronize,
    migrationsRun: flags.migrationsRun,
    logging: flags.logging,
    connectTimeout: connectTimeoutMs,
    retryAttempts: readDbPoolNumber(config, 'DB_RETRY_ATTEMPTS', 5),
    retryDelay: readDbPoolNumber(config, 'DB_RETRY_DELAY_MS', 2_000),
    extra: buildMariaDbPoolExtra(config),
    timezone: 'Z',
  };
}

function buildSqliteConfig(
  config: ConfigService,
  database: string,
): TypeOrmModuleOptions {
  const flags = readDbFlags(config);

  return {
    type: 'sqlite',
    database,
    entities: [...databaseEntities],
    migrations: migrationPaths(),
    synchronize: flags.synchronize,
    migrationsRun: flags.migrationsRun,
    logging: flags.logging,
  };
}

export function createTypeOrmConfig(
  config: ConfigService,
): TypeOrmModuleOptions {
  const driver = config.get<string>('DB_DRIVER', 'mariadb').toLowerCase();

  if (driver === 'sqlite') {
    return buildSqliteConfig(
      config,
      config.get<string>('DATABASE_PATH', ':memory:'),
    );
  }

  logDbConnectionTarget(config);
  return buildMariaDbConfig(config);
}
