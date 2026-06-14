import { Module } from '@nestjs/common';

import { SessionsModule } from '../sessions/sessions.module';
import { AuthController } from './auth.controller';
import { SessionGuard } from './session.guard';

@Module({
  imports: [SessionsModule],
  controllers: [AuthController],
  providers: [SessionGuard],
})
export class AuthModule {}
