import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';

import * as argon2 from 'argon2';
import { DataSource } from 'typeorm';

import { isUniqueViolation } from '../common/is-unique-violation';
import { EmailVerificationsService } from '../email-verifications/email-verifications.service';
import { AUTH_PROVIDER_LIST } from '../identities/auth-provider.constant';
import { IdentitiesService } from '../identities/identities.service';
import { MailPort } from '../mail/mail.port';
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
    private readonly mail: MailPort,
    private readonly dataSource: DataSource,
  ) {}

  async register(dto: RegisterDto): Promise<User> {
    const email = normalizeEmail(dto.email);

    const existing = await this.identities.findByProvider(AUTH_PROVIDER_LIST.EMAIL, email);

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await argon2.hash(dto.password);

    let user: User;

    try {
      user = await this.dataSource.transaction(async (manager) => {
        const created = await this.users.create(email, manager);

        await this.identities.create(
          {
            userId: created.id,
            provider: AUTH_PROVIDER_LIST.EMAIL,
            providerId: email,
            passwordHash,
          },
          manager,
        );

        return created;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Email already registered');
      }

      throw error;
    }

    await this.sendVerificationCode(user.id, email);

    return user;
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
}
