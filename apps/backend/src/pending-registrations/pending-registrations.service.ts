import { randomInt } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import * as argon2 from 'argon2';
import { EntityManager, Repository } from 'typeorm';

import { PendingRegistration } from './pending-registration.entity';
import { PENDING_REGISTRATION_RESULT } from './pending-registration-result.constant';
import { PendingRegistrationResult } from './pending-registration-result.type';

const CODE_MAX = 1_000_000;
const CODE_LENGTH = 6;
const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

@Injectable()
export class PendingRegistrationsService {
  constructor(
    @InjectRepository(PendingRegistration)
    private readonly pendingRegistrations: Repository<PendingRegistration>,
  ) {}

  async createPending(email: string, password: string): Promise<string> {
    await this.pendingRegistrations.delete({ email });

    const code = this.generateCode();

    const pending = this.pendingRegistrations.create({
      email,
      passwordHash: await argon2.hash(password),
      codeHash: await argon2.hash(code),
      expiresAt: new Date(Date.now() + TTL_MS),
    });

    await this.pendingRegistrations.save(pending);

    return code;
  }

  async verify(email: string, code: string): Promise<PendingRegistrationResult> {
    const pending = await this.pendingRegistrations.findOne({ where: { email } });

    if (!pending) {
      return PENDING_REGISTRATION_RESULT.INVALID;
    }

    if (Date.now() >= pending.expiresAt.getTime()) {
      await this.pendingRegistrations.remove(pending);

      return PENDING_REGISTRATION_RESULT.EXPIRED;
    }

    if (pending.attempts >= MAX_ATTEMPTS) {
      await this.pendingRegistrations.remove(pending);

      return PENDING_REGISTRATION_RESULT.LOCKED;
    }

    const valid = await argon2.verify(pending.codeHash, code);

    if (!valid) {
      pending.attempts += 1;
      await this.pendingRegistrations.save(pending);

      return PENDING_REGISTRATION_RESULT.INVALID;
    }

    return PENDING_REGISTRATION_RESULT.SUCCESS;
  }

  async refreshCode(email: string): Promise<string | null> {
    const pending = await this.pendingRegistrations.findOne({ where: { email } });

    if (!pending) {
      return null;
    }

    const code = this.generateCode();

    pending.codeHash = await argon2.hash(code);
    pending.expiresAt = new Date(Date.now() + TTL_MS);
    pending.attempts = 0;

    await this.pendingRegistrations.save(pending);

    return code;
  }

  findByEmail(email: string, manager?: EntityManager): Promise<PendingRegistration | null> {
    const repository = manager
      ? manager.getRepository(PendingRegistration)
      : this.pendingRegistrations;

    return repository.findOne({ where: { email } });
  }

  async deleteByEmail(email: string, manager?: EntityManager): Promise<void> {
    const repository = manager
      ? manager.getRepository(PendingRegistration)
      : this.pendingRegistrations;

    await repository.delete({ email });
  }

  private generateCode(): string {
    return randomInt(0, CODE_MAX).toString().padStart(CODE_LENGTH, '0');
  }
}
