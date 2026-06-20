import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IdentitiesService } from './identities.service';
import { Identity } from './identity.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Identity])],
  providers: [IdentitiesService],
  exports: [IdentitiesService],
})
export class IdentitiesModule {}
