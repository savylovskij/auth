import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { SessionsService } from './sessions.service';

@Injectable()
export class ExpiredSessionsCleaner {
  private readonly logger = new Logger(ExpiredSessionsCleaner.name);

  constructor(private readonly sessions: SessionsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanup(): Promise<void> {
    const removed = await this.sessions.deleteExpired();

    if (removed > 0) {
      this.logger.log(`Removed ${removed} expired session(s)`);
    }
  }
}
