import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import * as argon2 from 'argon2';

import { AUTH_PROVIDER_LIST } from '../identities/auth-provider.constant';
import { IdentitiesService } from '../identities/identities.service';
import { Identity } from '../identities/identity.entity';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

jest.mock('argon2');

const hash = argon2.hash as jest.Mock;
const verify = argon2.verify as jest.Mock;

describe('AuthService', () => {
  let service: AuthService;
  let users: jest.Mocked<Pick<UsersService, 'findByEmail' | 'create'>>;
  let identities: jest.Mocked<Pick<IdentitiesService, 'findByProvider' | 'create'>>;

  beforeEach(async () => {
    jest.clearAllMocks();
    users = { findByEmail: jest.fn(), create: jest.fn() };
    identities = { findByProvider: jest.fn(), create: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: IdentitiesService, useValue: identities },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('creates a user and an email identity with a hashed password', async () => {
      const user = { id: 'u1', email: 'user@example.com' } as User;

      identities.findByProvider.mockResolvedValue(null);
      users.create.mockResolvedValue(user);
      hash.mockResolvedValue('hashed');
      identities.create.mockResolvedValue({} as Identity);

      const result = await service.register({ email: '  User@Example.COM ', password: 'secret' });

      expect(result).toBe(user);
      expect(identities.findByProvider).toHaveBeenCalledWith(
        AUTH_PROVIDER_LIST.EMAIL,
        'user@example.com',
      );
      expect(users.create).toHaveBeenCalledWith('user@example.com');
      expect(hash).toHaveBeenCalledWith('secret');
      expect(identities.create).toHaveBeenCalledWith({
        userId: 'u1',
        provider: AUTH_PROVIDER_LIST.EMAIL,
        providerId: 'user@example.com',
        passwordHash: 'hashed',
      });
    });

    it('rejects a duplicate email without creating anything', async () => {
      identities.findByProvider.mockResolvedValue({ id: 'i1' } as Identity);

      await expect(
        service.register({ email: 'user@example.com', password: 'secret' }),
      ).rejects.toThrow(ConflictException);
      expect(users.create).not.toHaveBeenCalled();
      expect(identities.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns the user when the password matches', async () => {
      const user = { id: 'u1', email: 'user@example.com' } as User;
      identities.findByProvider.mockResolvedValue({ passwordHash: 'hashed', user } as Identity);
      verify.mockResolvedValue(true);

      const result = await service.login({ email: ' User@Example.com ', password: 'secret' });

      expect(result).toBe(user);
      expect(identities.findByProvider).toHaveBeenCalledWith(
        AUTH_PROVIDER_LIST.EMAIL,
        'user@example.com',
      );
      expect(verify).toHaveBeenCalledWith('hashed', 'secret');
    });

    it('rejects when no identity exists for the email', async () => {
      identities.findByProvider.mockResolvedValue(null);

      await expect(
        service.login({ email: 'user@example.com', password: 'secret' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(verify).not.toHaveBeenCalled();
    });

    it('rejects when the identity has no password hash', async () => {
      identities.findByProvider.mockResolvedValue({ passwordHash: null } as Identity);

      await expect(
        service.login({ email: 'user@example.com', password: 'secret' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(verify).not.toHaveBeenCalled();
    });

    it('rejects when the password does not match', async () => {
      identities.findByProvider.mockResolvedValue({ passwordHash: 'hashed' } as Identity);
      verify.mockResolvedValue(false);

      await expect(service.login({ email: 'user@example.com', password: 'wrong' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
