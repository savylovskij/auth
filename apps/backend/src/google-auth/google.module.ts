import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { IdentitiesModule } from '../identities/identities.module';
import { SessionsModule } from '../sessions/sessions.module';
import { UsersModule } from '../users/users.module';
import { googleConfig } from './google.config';
import { GoogleController } from './google.controller';
import { GoogleService } from './google.service';

@Module({
  imports: [ConfigModule.forFeature(googleConfig), UsersModule, IdentitiesModule, SessionsModule],
  controllers: [GoogleController],
  providers: [GoogleService],
  exports: [GoogleService],
})
export class GoogleModule {}
