import { randomInt } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import * as argon2 from 'argon2';
import { Repository } from 'typeorm';

import { EmailVerification } from './email-verification.entity';
import { EMAIL_VERIFICATION_RESULT } from './email-verification-result.constant';
import { EmailVerificationResult } from './email-verification-result.type';

const CODE_MAX = 1_000_000;
const CODE_LENGTH = 6;
const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

@Injectable()
export class EmailVerificationsService {
  constructor(
    @InjectRepository(EmailVerification)
    private readonly verifications: Repository<EmailVerification>,
  ) {}

  async createCode(userId: string): Promise<string> {
    await this.verifications.delete({ userId });

    const code = this.generateCode();

    const verification = this.verifications.create({
      userId,
      codeHash: await argon2.hash(code),
      expiresAt: new Date(Date.now() + TTL_MS),
    });

    await this.verifications.save(verification);

    return code;
  }

  async verify(userId: string, code: string): Promise<EmailVerificationResult> {
    const verification = await this.verifications.findOne({ where: { userId } });

    if (!verification) {
      return EMAIL_VERIFICATION_RESULT.INVALID;
    }

    if (Date.now() >= verification.expiresAt.getTime()) {
      await this.verifications.remove(verification);

      return EMAIL_VERIFICATION_RESULT.EXPIRED;
    }

    if (verification.attempts >= MAX_ATTEMPTS) {
      await this.verifications.remove(verification);

      return EMAIL_VERIFICATION_RESULT.LOCKED;
    }

    const valid = await argon2.verify(verification.codeHash, code);

    if (!valid) {
      verification.attempts += 1;
      await this.verifications.save(verification);

      return EMAIL_VERIFICATION_RESULT.INVALID;
    }

    await this.verifications.remove(verification);

    return EMAIL_VERIFICATION_RESULT.SUCCESS;
  }

  private generateCode(): string {
    return randomInt(0, CODE_MAX).toString().padStart(CODE_LENGTH, '0');
  }
}
