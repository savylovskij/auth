import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { googleConfig } from './google.config';
import { GoogleController } from './google.controller';
import { GoogleService } from './google.service';

@Module({
  imports: [ConfigModule.forFeature(googleConfig)],
  controllers: [GoogleController],
  providers: [GoogleService],
  exports: [GoogleService],
})
export class GoogleModule {}
