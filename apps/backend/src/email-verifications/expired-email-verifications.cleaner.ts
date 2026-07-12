import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { EmailVerificationsService } from './email-verifications.service';

@Injectable()
export class ExpiredEmailVerificationsCleaner {
  private readonly logger = new Logger(ExpiredEmailVerificationsCleaner.name);

  constructor(private readonly verifications: EmailVerificationsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanup(): Promise<void> {
    const removed = await this.verifications.deleteExpired();

    if (removed > 0) {
      this.logger.log(`Removed ${removed} expired email verification(s)`);
    }
  }
}
