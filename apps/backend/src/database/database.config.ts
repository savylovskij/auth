import { join } from 'node:path';

import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

import { DataSourceOptions } from 'typeorm';
import { z } from 'zod';

const databaseEnvSchema = z.object({
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
  POSTGRES_USER: z.string().default('auth'),
  POSTGRES_PASSWORD: z.string().default('auth'),
  POSTGRES_DB: z.string().default('auth'),
  POSTGRES_SYNCHRONIZE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export function buildDataSourceOptions(env: NodeJS.ProcessEnv = process.env): DataSourceOptions {
  const parsed = databaseEnvSchema.parse(env);

  return {
    type: 'postgres',
    host: parsed.POSTGRES_HOST,
    port: parsed.POSTGRES_PORT,
    username: parsed.POSTGRES_USER,
    password: parsed.POSTGRES_PASSWORD,
    database: parsed.POSTGRES_DB,
    synchronize: parsed.POSTGRES_SYNCHRONIZE,
    uuidExtension: 'pgcrypto',
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  };
}

export const databaseConfig = registerAs(
  'database',
  (): TypeOrmModuleOptions => ({ ...buildDataSourceOptions(), autoLoadEntities: true }),
);
