import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EmailVerification } from './email-verification.entity';
import { EmailVerificationsService } from './email-verifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([EmailVerification])],
  providers: [EmailVerificationsService],
  exports: [EmailVerificationsService],
})
export class EmailVerificationsModule {}
