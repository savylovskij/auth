import { randomInt } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import * as argon2 from 'argon2';
import { LessThan, Repository } from 'typeorm';

import { PasswordReset } from './password-reset.entity';
import { PASSWORD_RESET_RESULT } from './password-reset-result.constant';
import { PasswordResetResult } from './password-reset-result.type';

const CODE_MAX = 1_000_000;
const CODE_LENGTH = 6;
const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

@Injectable()
export class PasswordResetsService {
  constructor(
    @InjectRepository(PasswordReset)
    private readonly resets: Repository<PasswordReset>,
  ) {}

  async createCode(userId: string): Promise<string> {
    await this.resets.delete({ userId });

    const code = this.generateCode();

    const reset = this.resets.create({
      userId,
      codeHash: await argon2.hash(code),
      expiresAt: new Date(Date.now() + TTL_MS),
    });

    await this.resets.save(reset);

    return code;
  }

  async verify(userId: string, code: string): Promise<PasswordResetResult> {
    const reset = await this.resets.findOne({ where: { userId } });

    if (!reset) {
      return PASSWORD_RESET_RESULT.INVALID;
    }

    if (Date.now() >= reset.expiresAt.getTime()) {
      await this.resets.remove(reset);

      return PASSWORD_RESET_RESULT.EXPIRED;
    }

    if (reset.attempts >= MAX_ATTEMPTS) {
      await this.resets.remove(reset);

      return PASSWORD_RESET_RESULT.LOCKED;
    }

    const valid = await argon2.verify(reset.codeHash, code);

    if (!valid) {
      reset.attempts += 1;
      await this.resets.save(reset);

      return PASSWORD_RESET_RESULT.INVALID;
    }

    await this.resets.remove(reset);

    return PASSWORD_RESET_RESULT.SUCCESS;
  }

  async deleteExpired(): Promise<number> {
    const result = await this.resets.delete({ expiresAt: LessThan(new Date()) });

    return result.affected ?? 0;
  }

  private generateCode(): string {
    return randomInt(0, CODE_MAX).toString().padStart(CODE_LENGTH, '0');
  }
}
