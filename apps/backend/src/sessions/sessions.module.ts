import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { sessionConfig } from './session.config';
import { Session } from './session.entity';
import { SessionsService } from './sessions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Session]), ConfigModule.forFeature(sessionConfig)],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
