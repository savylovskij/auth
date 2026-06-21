import { Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { throttlerConfig } from './throttler.config';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule.forFeature(throttlerConfig)],
      inject: [throttlerConfig.KEY],
      useFactory: (config: ConfigType<typeof throttlerConfig>) => [
        {
          ttl: config.ttlMs,
          limit: config.limit,
        },
      ],
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class ThrottlingModule {}
