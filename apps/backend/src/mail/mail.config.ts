import { registerAs } from '@nestjs/config';

import { z } from 'zod';

const mailEnvSchema = z.object({
  MAIL_HOST: z.string().default('localhost'),
  MAIL_PORT: z.coerce.number().int().positive().default(1025),
  MAIL_FROM: z.string(),
});

export const mailConfig = registerAs('mail', () => {
  const env = mailEnvSchema.parse(process.env);

  return {
    host: env.MAIL_HOST,
    port: env.MAIL_PORT,
    from: env.MAIL_FROM,
  };
});
