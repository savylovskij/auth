import { registerAs } from '@nestjs/config';

import { z } from 'zod';

const DAY_MS = 24 * 60 * 60 * 1000;

const sessionEnvSchema = z
  .object({
    SESSION_IDLE_TTL_DAYS: z.coerce.number().int().positive().default(7),
    SESSION_ABSOLUTE_TTL_DAYS: z.coerce.number().int().positive().default(30),
  })
  .refine((env) => env.SESSION_ABSOLUTE_TTL_DAYS >= env.SESSION_IDLE_TTL_DAYS, {
    message: 'SESSION_ABSOLUTE_TTL_DAYS must be >= SESSION_IDLE_TTL_DAYS',
  });

export const sessionConfig = registerAs('session', () => {
  const env = sessionEnvSchema.parse(process.env);

  return {
    idleTtlMs: env.SESSION_IDLE_TTL_DAYS * DAY_MS,
    absoluteTtlMs: env.SESSION_ABSOLUTE_TTL_DAYS * DAY_MS,
  };
});
