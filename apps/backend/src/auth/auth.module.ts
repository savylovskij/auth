import { Module } from '@nestjs/common';

import { EmailVerificationsModule } from '../email-verifications/email-verifications.module';
import { IdentitiesModule } from '../identities/identities.module';
import { MailModule } from '../mail/mail.module';
import { SessionsModule } from '../sessions/sessions.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [SessionsModule, UsersModule, IdentitiesModule, EmailVerificationsModule, MailModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
