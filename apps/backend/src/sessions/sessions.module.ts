import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ExpiredSessionsCleaner } from './expired-sessions.cleaner';
import { sessionConfig } from './session.config';
import { Session } from './session.entity';
import { SessionGuard } from './session.guard';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Session]), ConfigModule.forFeature(sessionConfig)],
  controllers: [SessionsController],
  providers: [SessionsService, SessionGuard, ExpiredSessionsCleaner],
  exports: [SessionsService, SessionGuard],
})
export class SessionsModule {}
