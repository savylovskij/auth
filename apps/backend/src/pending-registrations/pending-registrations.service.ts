import { createHash, randomBytes, randomInt } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import * as argon2 from 'argon2';
import { EntityManager, LessThan, Repository } from 'typeorm';

import { PendingRegistration } from './pending-registration.entity';
import { PENDING_REGISTRATION_RESULT } from './pending-registration-result.constant';
import { PendingRegistrationResult } from './pending-registration-result.type';
import { PendingRegistrationTicket } from './pending-registration-ticket.interface';

const CODE_MAX = 1_000_000;
const CODE_LENGTH = 6;
const TOKEN_BYTES = 32;
const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

@Injectable()
export class PendingRegistrationsService {
  constructor(
    @InjectRepository(PendingRegistration)
    private readonly pendingRegistrations: Repository<PendingRegistration>,
  ) {}

  async createPending(email: string, password: string): Promise<PendingRegistrationTicket> {
    const token = this.generateToken();
    const code = this.generateCode();

    const pending = this.pendingRegistrations.create({
      email,
      tokenHash: this.hashToken(token),
      passwordHash: await argon2.hash(password),
      codeHash: await argon2.hash(code),
      expiresAt: new Date(Date.now() + TTL_MS),
    });

    await this.pendingRegistrations.save(pending);

    return { token, code };
  }

  async verify(token: string, email: string, code: string): Promise<PendingRegistrationResult> {
    const pending = await this.findOwnedBy(token, email);

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

  async refreshCode(token: string, email: string): Promise<string | null> {
    const pending = await this.findOwnedBy(token, email);

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

  findByToken(token: string, manager?: EntityManager): Promise<PendingRegistration | null> {
    return this.repositoryFor(manager).findOne({ where: { tokenHash: this.hashToken(token) } });
  }

  async deleteByEmail(email: string, manager?: EntityManager): Promise<void> {
    await this.repositoryFor(manager).delete({ email });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.pendingRegistrations.delete({ expiresAt: LessThan(new Date()) });

    return result.affected ?? 0;
  }

  private async findOwnedBy(token: string, email: string): Promise<PendingRegistration | null> {
    const pending = await this.findByToken(token);

    return pending?.email === email ? pending : null;
  }

  private repositoryFor(manager?: EntityManager): Repository<PendingRegistration> {
    return manager ? manager.getRepository(PendingRegistration) : this.pendingRegistrations;
  }

  private generateCode(): string {
    return randomInt(0, CODE_MAX).toString().padStart(CODE_LENGTH, '0');
  }

  private generateToken(): string {
    return randomBytes(TOKEN_BYTES).toString('base64url');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
