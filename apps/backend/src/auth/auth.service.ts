import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import * as argon2 from 'argon2';
import { DataSource } from 'typeorm';

import { EMAIL_VERIFICATION_RESULT } from '../email-verifications/email-verification-result.constant';
import { EmailVerificationsService } from '../email-verifications/email-verifications.service';
import { AUTH_PROVIDER_LIST } from '../identities/auth-provider.constant';
import { IdentitiesService } from '../identities/identities.service';
import { MailPort } from '../mail/mail.port';
import { PASSWORD_RESET_RESULT } from '../password-resets/password-reset-result.constant';
import { PasswordResetsService } from '../password-resets/password-resets.service';
import { PendingRegistrationsService } from '../pending-registrations/pending-registrations.service';
import { SessionsService } from '../sessions/sessions.service';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { normalizeEmail } from './normalize-email';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly identities: IdentitiesService,
    private readonly emailVerifications: EmailVerificationsService,
    private readonly pendingRegistrations: PendingRegistrationsService,
    private readonly passwordResets: PasswordResetsService,
    private readonly sessions: SessionsService,
    private readonly mail: MailPort,
    private readonly dataSource: DataSource,
  ) {}

  async register(dto: RegisterDto): Promise<void> {
    const email = normalizeEmail(dto.email);

    const existing = await this.users.findByEmail(email);

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const code = await this.pendingRegistrations.createPending(email, dto.password);

    await this.mail.send({
      to: email,
      subject: 'Verify your email',
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
    });
  }

  async verifyEmail(user: User, code: string): Promise<User> {
    if (user.emailVerifiedAt) {
      throw new ConflictException('Email already verified');
    }

    const result = await this.emailVerifications.verify(user.id, code);

    switch (result) {
      case EMAIL_VERIFICATION_RESULT.SUCCESS:
        return this.users.markEmailVerified(user);
      case EMAIL_VERIFICATION_RESULT.EXPIRED:
        throw new BadRequestException('Verification code has expired');
      case EMAIL_VERIFICATION_RESULT.LOCKED:
        throw new BadRequestException('Too many attempts, request a new code');
      default:
        throw new BadRequestException('Invalid verification code');
    }
  }

  async resendVerification(user: User): Promise<void> {
    if (user.emailVerifiedAt) {
      throw new ConflictException('Email already verified');
    }

    await this.sendVerificationCode(user.id, user.email);
  }

  private async sendVerificationCode(userId: string, email: string): Promise<void> {
    const code = await this.emailVerifications.createCode(userId);

    await this.mail.send({
      to: email,
      subject: 'Verify your email',
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
    });
  }

  async login(dto: LoginDto): Promise<User> {
    const email = normalizeEmail(dto.email);

    const identity = await this.identities.findByProvider(AUTH_PROVIDER_LIST.EMAIL, email);

    if (!identity?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await argon2.verify(identity.passwordHash, dto.password);

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
