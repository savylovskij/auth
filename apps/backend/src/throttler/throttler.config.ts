import { registerAs } from '@nestjs/config';

import { z } from 'zod';

const throttlerEnvSchema = z.object({
  THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60000),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),
  AUTH_THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60000),
  AUTH_THROTTLE_LIMIT: z.coerce.number().int().positive().default(5),
});

let parsedEnv: z.infer<typeof throttlerEnvSchema> | undefined;

function throttlerEnv(): z.infer<typeof throttlerEnvSchema> {
  parsedEnv ??= throttlerEnvSchema.parse(process.env);

  return parsedEnv;
}

export const AUTH_THROTTLE = {
  ttl: () => throttlerEnv().AUTH_THROTTLE_TTL_MS,
  limit: () => throttlerEnv().AUTH_THROTTLE_LIMIT,
};

export const throttlerConfig = registerAs('throttler', () => {
  const env = throttlerEnv();

  return {
    ttlMs: env.THROTTLE_TTL_MS,
    limit: env.THROTTLE_LIMIT,
  };
});
