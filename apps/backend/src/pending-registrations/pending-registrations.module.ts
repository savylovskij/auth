import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ExpiredPendingRegistrationsCleaner } from './expired-pending-registrations.cleaner';
import { PendingRegistration } from './pending-registration.entity';
import { PendingRegistrationsService } from './pending-registrations.service';

@Module({
  imports: [TypeOrmModule.forFeature([PendingRegistration])],
  providers: [PendingRegistrationsService, ExpiredPendingRegistrationsCleaner],
  exports: [PendingRegistrationsService],
})
export class PendingRegistrationsModule {}
