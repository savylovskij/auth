import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PendingRegistration } from './pending-registration.entity';
import { PendingRegistrationsService } from './pending-registrations.service';

@Module({
  imports: [TypeOrmModule.forFeature([PendingRegistration])],
  providers: [PendingRegistrationsService],
  exports: [PendingRegistrationsService],
})
export class PendingRegistrationsModule {}
