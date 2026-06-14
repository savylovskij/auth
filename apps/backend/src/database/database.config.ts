import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
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

export const databaseConfig = registerAs('database', (): TypeOrmModuleOptions => {
  const env = databaseEnvSchema.parse(process.env);

  return {
    type: 'postgres',
    host: env.POSTGRES_HOST,
    port: env.POSTGRES_PORT,
    username: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DB,
    autoLoadEntities: true,
    synchronize: env.POSTGRES_SYNCHRONIZE,
  };
});
