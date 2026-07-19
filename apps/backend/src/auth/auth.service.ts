import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';

import * as argon2 from 'argon2';
import { DataSource } from 'typeorm';

import { isUniqueViolation } from '../common/is-unique-violation';
import { verifyDecoyHash } from '../common/verify-decoy-hash';
import { AUTH_PROVIDER_LIST } from '../identities/auth-provider.constant';
import { IdentitiesService } from '../identities/identities.service';
import { Identity } from '../identities/identity.entity';
import { MailPort } from '../mail/mail.port';
import { PASSWORD_RESET_RESULT } from '../password-resets/password-reset-result.constant';
import { PasswordResetsService } from '../password-resets/password-resets.service';
import { PENDING_REGISTRATION_RESULT } from '../pending-registrations/pending-registration-result.constant';
import { PendingRegistrationsService } from '../pending-registrations/pending-registrations.service';
import { SessionsService } from '../sessions/sessions.service';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { normalizeEmail } from './normalize-email';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly identities: IdentitiesService,
    private readonly pendingRegistrations: PendingRegistrationsService,
    private readonly passwordResets: PasswordResetsService,
    private readonly sessions: SessionsService,
    private readonly mail: MailPort,
    private readonly dataSource: DataSource,
  ) {}

  async register(credentials: RegisterDto): Promise<string> {
    const email = normalizeEmail(credentials.email);

    const existing = await this.users.findByEmail(email);

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const { token, code } = await this.pendingRegistrations.createPending(
      email,
      credentials.password,
    );

    await this.mail.send({
      to: email,
      subject: 'Verify your email',
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
    });

    return token;
  }

  async verifyEmail(token: string | null, email: string, code: string): Promise<User> {
    const normalized = normalizeEmail(email);

    if (!token) {
      throw new BadRequestException('Invalid verification code');
    }

    const result = await this.pendingRegistrations.verify(token, normalized, code);

    switch (result) {
      case PENDING_REGISTRATION_RESULT.SUCCESS:
        break;
      case PENDING_REGISTRATION_RESULT.EXPIRED:
        throw new BadRequestException('Verification code has expired');
      case PENDING_REGISTRATION_RESULT.LOCKED:
        throw new BadRequestException('Too many attempts, request a new code');
      default:
        throw new BadRequestException('Invalid verification code');
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const pending = await this.pendingRegistrations.findByToken(token, manager);

        if (!pending) {
          throw new BadRequestException('Invalid verification code');
        }

        const user = await this.users.create(pending.email, manager);

        await this.identities.create(
          {
            userId: user.id,
            provider: AUTH_PROVIDER_LIST.EMAIL,
            providerId: pending.email,
            passwordHash: pending.passwordHash,
          },
          manager,
        );

        await this.pendingRegistrations.deleteByEmail(pending.email, manager);

        return this.users.markEmailVerified(user, manager);
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Email already registered');
      }

      throw error;
    }
  }

  async resendVerification(token: string | null, email: string): Promise<void> {
    const normalized = normalizeEmail(email);

    if (!token) {
      return;
    }

    const code = await this.pendingRegistrations.refreshCode(token, normalized);

    if (!code) {
      return;
    }

    await this.mail.send({
      to: normalized,
      subject: 'Verify your email',
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
    });
  }

  async login(credentials: LoginDto): Promise<User> {
    const email = normalizeEmail(credentials.email);

    const identity = await this.identities.findByProvider(AUTH_PROVIDER_LIST.EMAIL, email);

    if (!identity?.passwordHash) {
      await verifyDecoyHash(credentials.password);

      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await argon2.verify(identity.passwordHash, credentials.password);

    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return identity.user;
  }

  async forgotPassword(email: string): Promise<void> {
    const identity = await this.identities.findByProvider(
      AUTH_PROVIDER_LIST.EMAIL,
      normalizeEmail(email),
    );

    if (!identity) {
      return;
    }

    void this.sendPasswordResetCode(identity).catch((error: unknown) =>
      this.logger.error(`Failed to send password reset code to user ${identity.userId}`, error),
    );
  }

  private async sendPasswordResetCode(identity: Identity): Promise<void> {
    const code = await this.passwordResets.createCode(identity.userId);

    await this.mail.send({
      to: identity.providerId,
      subject: 'Reset your password',
      text: `Your password reset code is ${code}. It expires in 10 minutes.`,
    });
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const identity = await this.identities.findByProvider(
      AUTH_PROVIDER_LIST.EMAIL,
      normalizeEmail(email),
    );

    if (!identity) {
      await verifyDecoyHash(code);

      throw new BadRequestException('Invalid password reset code');
    }

    const result = await this.passwordResets.verify(identity.userId, code);

    switch (result) {
      case PASSWORD_RESET_RESULT.SUCCESS:
        break;
      case PASSWORD_RESET_RESULT.EXPIRED:
        throw new BadRequestException('Password reset code has expired');
      case PASSWORD_RESET_RESULT.LOCKED:
        throw new BadRequestException('Too many attempts, request a new code');
      default:
        throw new BadRequestException('Invalid password reset code');
    }

    await this.identities.updatePassword(identity.id, await argon2.hash(newPassword));
    await this.sessions.revokeByUserId(identity.userId);
  }
}
