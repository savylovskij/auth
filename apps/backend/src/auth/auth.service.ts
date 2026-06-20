import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';

import * as argon2 from 'argon2';

import { AUTH_PROVIDER_LIST } from '../identities/auth-provider.constant';
import { IdentitiesService } from '../identities/identities.service';
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
  ) {}

  async register(dto: RegisterDto): Promise<User> {
    const email = normalizeEmail(dto.email);

    const existing = await this.identities.findByProvider(AUTH_PROVIDER_LIST.EMAIL, email);

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const user = await this.users.create(email);
    const passwordHash = await argon2.hash(dto.password);

    await this.identities.create({
      userId: user.id,
      provider: AUTH_PROVIDER_LIST.EMAIL,
      providerId: email,
      passwordHash,
    });

    return user;
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
