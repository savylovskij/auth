import { registerAs } from '@nestjs/config';

import { z } from 'zod';

export const AUTH_THROTTLE = { ttl: 60000, limit: 5 };

const throttlerEnvSchema = z.object({
  THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60000),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),
});

export const throttlerConfig = registerAs('throttler', () => {
  const env = throttlerEnvSchema.parse(process.env);

  return {
    ttlMs: env.THROTTLE_TTL_MS,
    limit: env.THROTTLE_LIMIT,
  };
});
