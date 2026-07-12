import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import * as argon2 from 'argon2';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';

import { AUTH_PROVIDER_LIST } from '../identities/auth-provider.constant';
import { IdentitiesService } from '../identities/identities.service';
import { Identity } from '../identities/identity.entity';
import { MailPort } from '../mail/mail.port';
import { PasswordResetsService } from '../password-resets/password-resets.service';
import { PendingRegistration } from '../pending-registrations/pending-registration.entity';
import { PENDING_REGISTRATION_RESULT } from '../pending-registrations/pending-registration-result.constant';
import { PendingRegistrationsService } from '../pending-registrations/pending-registrations.service';
import { SessionsService } from '../sessions/sessions.service';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

jest.mock('argon2');

const verify = argon2.verify as jest.Mock;

describe('AuthService', () => {
  let service: AuthService;
  let users: jest.Mocked<Pick<UsersService, 'findByEmail' | 'create' | 'markEmailVerified'>>;
  let identities: jest.Mocked<Pick<IdentitiesService, 'findByProvider' | 'create'>>;
  let pendingRegistrations: jest.Mocked<
    Pick<
      PendingRegistrationsService,
      'createPending' | 'verify' | 'refreshCode' | 'findByEmail' | 'deleteByEmail'
    >
  >;
  let passwordResets: jest.Mocked<Pick<PasswordResetsService, 'createCode' | 'verify'>>;
  let sessions: jest.Mocked<Pick<SessionsService, 'revokeByUserId'>>;
  let mail: jest.Mocked<Pick<MailPort, 'send'>>;
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    users = { findByEmail: jest.fn(), create: jest.fn(), markEmailVerified: jest.fn() };
    identities = { findByProvider: jest.fn(), create: jest.fn() };
    pendingRegistrations = {
      createPending: jest.fn(),
      verify: jest.fn(),
      refreshCode: jest.fn(),
      findByEmail: jest.fn(),
      deleteByEmail: jest.fn().mockResolvedValue(undefined),
    };
    passwordResets = { createCode: jest.fn(), verify: jest.fn() };
    sessions = { revokeByUserId: jest.fn().mockResolvedValue(undefined) };
    mail = { send: jest.fn().mockResolvedValue(undefined) };
    dataSource = {
      transaction: jest.fn((cb: (manager: EntityManager) => Promise<unknown>) =>
        cb({} as EntityManager),
      ),
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: IdentitiesService, useValue: identities },
        { provide: PendingRegistrationsService, useValue: pendingRegistrations },
        { provide: PasswordResetsService, useValue: passwordResets },
        { provide: SessionsService, useValue: sessions },
        { provide: MailPort, useValue: mail },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('stages a pending registration and emails the verification code', async () => {
      users.findByEmail.mockResolvedValue(null);
      pendingRegistrations.createPending.mockResolvedValue('123456');

      await service.register({ email: '  User@Example.COM ', password: 'secret' });

      expect(users.findByEmail).toHaveBeenCalledWith('user@example.com');
      expect(pendingRegistrations.createPending).toHaveBeenCalledWith('user@example.com', 'secret');
      expect(mail.send).toHaveBeenCalledWith({
        to: 'user@example.com',
        subject: 'Verify your email',
        text: 'Your verification code is 123456. It expires in 10 minutes.',
      });
    });

    it('rejects a duplicate email without staging anything', async () => {
      users.findByEmail.mockResolvedValue({ id: 'u1' } as User);

      await expect(
        service.register({ email: 'user@example.com', password: 'secret' }),
      ).rejects.toThrow(ConflictException);
      expect(pendingRegistrations.createPending).not.toHaveBeenCalled();
      expect(mail.send).not.toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    it('provisions the account and returns the verified user on a valid code', async () => {
      const user = { id: 'u1', email: 'user@example.com' } as User;
      const verified = { ...user, emailVerifiedAt: new Date() } as User;

      pendingRegistrations.verify.mockResolvedValue(PENDING_REGISTRATION_RESULT.SUCCESS);
      pendingRegistrations.findByEmail.mockResolvedValue({
        passwordHash: 'hashed',
      } as PendingRegistration);
      users.create.mockResolvedValue(user);
      identities.create.mockResolvedValue({} as Identity);
      users.markEmailVerified.mockResolvedValue(verified);

      const result = await service.verifyEmail(' User@Example.com ', '123456');

      expect(result).toBe(verified);
      expect(pendingRegistrations.verify).toHaveBeenCalledWith('user@example.com', '123456');
      expect(users.create).toHaveBeenCalledWith('user@example.com', expect.anything());
      expect(identities.create).toHaveBeenCalledWith(
        {
          userId: 'u1',
          provider: AUTH_PROVIDER_LIST.EMAIL,
          providerId: 'user@example.com',
          passwordHash: 'hashed',
        },
        expect.anything(),
      );
      expect(pendingRegistrations.deleteByEmail).toHaveBeenCalledWith(
        'user@example.com',
        expect.anything(),
      );
    });

    it('rejects an invalid code without provisioning', async () => {
      pendingRegistrations.verify.mockResolvedValue(PENDING_REGISTRATION_RESULT.INVALID);

      await expect(service.verifyEmail('user@example.com', '000000')).rejects.toThrow(
        BadRequestException,
      );
      expect(users.create).not.toHaveBeenCalled();
    });

    it('maps a unique violation during provisioning to ConflictException', async () => {
      pendingRegistrations.verify.mockResolvedValue(PENDING_REGISTRATION_RESULT.SUCCESS);
      pendingRegistrations.findByEmail.mockResolvedValue({
        passwordHash: 'hashed',
      } as PendingRegistration);
      users.create.mockResolvedValue({ id: 'u1' } as User);
      identities.create.mockRejectedValue(
        new QueryFailedError('insert', [], { code: '23505' } as unknown as Error),
      );

      await expect(service.verifyEmail('user@example.com', '123456')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('resendVerification', () => {
    it('refreshes the code and emails it', async () => {
      pendingRegistrations.refreshCode.mockResolvedValue('654321');

      await service.resendVerification(' User@Example.com ');

      expect(pendingRegistrations.refreshCode).toHaveBeenCalledWith('user@example.com');
      expect(mail.send).toHaveBeenCalledWith({
        to: 'user@example.com',
        subject: 'Verify your email',
        text: 'Your verification code is 654321. It expires in 10 minutes.',
      });
    });

    it('stays silent when there is no pending registration', async () => {
      pendingRegistrations.refreshCode.mockResolvedValue(null);

      await service.resendVerification('user@example.com');

      expect(mail.send).not.toHaveBeenCalled();
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

    it('rejects an unknown email after a decoy verification', async () => {
      identities.findByProvider.mockResolvedValue(null);

      await expect(
        service.login({ email: 'user@example.com', password: 'secret' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(verify).toHaveBeenCalledTimes(1);
    });

    it('rejects a google-only identity after a decoy verification', async () => {
      identities.findByProvider.mockResolvedValue({ passwordHash: null } as Identity);

      await expect(
        service.login({ email: 'user@example.com', password: 'secret' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(verify).toHaveBeenCalledTimes(1);
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
