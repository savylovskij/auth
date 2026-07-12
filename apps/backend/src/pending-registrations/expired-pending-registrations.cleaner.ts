import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PendingRegistrationsService } from './pending-registrations.service';

@Injectable()
export class ExpiredPendingRegistrationsCleaner {
  private readonly logger = new Logger(ExpiredPendingRegistrationsCleaner.name);

  constructor(private readonly pendingRegistrations: PendingRegistrationsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanup(): Promise<void> {
    const removed = await this.pendingRegistrations.deleteExpired();

    if (removed > 0) {
      this.logger.log(`Removed ${removed} expired pending registration(s)`);
    }
  }
}
