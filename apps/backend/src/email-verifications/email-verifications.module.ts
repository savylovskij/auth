import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EmailVerification } from './email-verification.entity';
import { EmailVerificationsService } from './email-verifications.service';
import { ExpiredEmailVerificationsCleaner } from './expired-email-verifications.cleaner';

@Module({
  imports: [TypeOrmModule.forFeature([EmailVerification])],
  providers: [EmailVerificationsService, ExpiredEmailVerificationsCleaner],
  exports: [EmailVerificationsService],
})
export class EmailVerificationsModule {}
