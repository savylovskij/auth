import { Module } from '@nestjs/common';

import { IdentitiesModule } from '../identities/identities.module';
import { SessionsModule } from '../sessions/sessions.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [SessionsModule, UsersModule, IdentitiesModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
