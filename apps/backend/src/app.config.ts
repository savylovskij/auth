import { registerAs } from '@nestjs/config';

import { z } from 'zod';

const appEnvSchema = z.object({
  FRONTEND_URL: z.string().url(),
});

export const appConfig = registerAs('app', () => {
  const env = appEnvSchema.parse(process.env);

  return {
    frontendUrl: env.FRONTEND_URL,
  };
});
