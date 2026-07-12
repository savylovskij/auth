import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PasswordResetsService } from './password-resets.service';

@Injectable()
export class ExpiredPasswordResetsCleaner {
  private readonly logger = new Logger(ExpiredPasswordResetsCleaner.name);

  constructor(private readonly resets: PasswordResetsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanup(): Promise<void> {
    const removed = await this.resets.deleteExpired();

    if (removed > 0) {
      this.logger.log(`Removed ${removed} expired password reset(s)`);
    }
  }
}
