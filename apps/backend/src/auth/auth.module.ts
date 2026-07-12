import { Module } from '@nestjs/common';

import { IdentitiesModule } from '../identities/identities.module';
import { MailModule } from '../mail/mail.module';
import { PasswordResetsModule } from '../password-resets/password-resets.module';
import { PendingRegistrationsModule } from '../pending-registrations/pending-registrations.module';
import { SessionsModule } from '../sessions/sessions.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    UsersModule,
    MailModule,
    SessionsModule,
    IdentitiesModule,
    PasswordResetsModule,
    PendingRegistrationsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
