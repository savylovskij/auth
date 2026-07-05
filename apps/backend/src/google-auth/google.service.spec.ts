import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { DataSource, EntityManager, QueryFailedError } from 'typeorm';

import { AUTH_PROVIDER_LIST } from '../identities/auth-provider.constant';
import { IdentitiesService } from '../identities/identities.service';
import { Identity } from '../identities/identity.entity';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { googleConfig } from './google.config';
import { GoogleService } from './google.service';
import { GoogleProfile } from './google-profile.interface';

const CONFIG = {
  clientId: 'client-id',
  clientSecret: 'client-secret',
  redirectUri: 'http://localhost:3000/auth/google/callback',
};

function profile(overrides: Partial<GoogleProfile> = {}): GoogleProfile {
  return { sub: 'google-sub', email: 'user@example.com', emailVerified: true, ...overrides };
}

describe('GoogleService', () => {
  let service: GoogleService;
  let users: jest.Mocked<Pick<UsersService, 'findByEmail' | 'create'>>;
  let identities: jest.Mocked<Pick<IdentitiesService, 'findByProvider' | 'create'>>;
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    users = { findByEmail: jest.fn(), create: jest.fn() };
    identities = { findByProvider: jest.fn(), create: jest.fn() };
    dataSource = {
      transaction: jest.fn((cb: (manager: EntityManager) => Promise<unknown>) =>
        cb({} as EntityManager),
      ),
    };

    const module = await Test.createTestingModule({
      providers: [
        GoogleService,
        { provide: googleConfig.KEY, useValue: CONFIG },
        { provide: UsersService, useValue: users },
        { provide: IdentitiesService, useValue: identities },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(GoogleService);
  });

  describe('loginWithGoogle', () => {
    it('returns the linked user when the google identity already exists', async () => {
      const user = { id: 'u1' } as User;
      identities.findByProvider.mockResolvedValue({ user } as Identity);

      const result = await service.loginWithGoogle(profile({ emailVerified: false }));

      expect(result).toBe(user);
      expect(users.create).not.toHaveBeenCalled();
      expect(identities.create).not.toHaveBeenCalled();
    });

    it('rejects an unverified email when the identity is new', async () => {
      identities.findByProvider.mockResolvedValue(null);

      await expect(service.loginWithGoogle(profile({ emailVerified: false }))).rejects.toThrow(
        UnauthorizedException,
      );
      expect(users.create).not.toHaveBeenCalled();
      expect(identities.create).not.toHaveBeenCalled();
    });

    it('links a google identity to an existing user found by email', async () => {
      const user = { id: 'u1' } as User;
      identities.findByProvider.mockResolvedValue(null);
      users.findByEmail.mockResolvedValue(user);

      const result = await service.loginWithGoogle(profile({ email: 'User@Example.COM' }));

      expect(result).toBe(user);
      expect(users.findByEmail).toHaveBeenCalledWith('user@example.com', expect.anything());
      expect(users.create).not.toHaveBeenCalled();
      expect(identities.create).toHaveBeenCalledWith(
        {
          userId: 'u1',
          provider: AUTH_PROVIDER_LIST.GOOGLE,
          providerId: 'google-sub',
        },
        expect.anything(),
      );
    });

    it('creates a new user and links the identity when no user matches', async () => {
      const user = { id: 'u2' } as User;
      identities.findByProvider.mockResolvedValue(null);
      users.findByEmail.mockResolvedValue(null);
      users.create.mockResolvedValue(user);

      const result = await service.loginWithGoogle(profile());

      expect(result).toBe(user);
      expect(users.create).toHaveBeenCalledWith('user@example.com', expect.anything());
      expect(identities.create).toHaveBeenCalledWith(
        {
          userId: 'u2',
          provider: AUTH_PROVIDER_LIST.GOOGLE,
          providerId: 'google-sub',
        },
        expect.anything(),
      );
    });

    it('recovers from a concurrent-signup unique violation by returning the linked user', async () => {
      const winner = { id: 'u9' } as User;
      identities.findByProvider
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ user: winner } as Identity);
      users.findByEmail.mockResolvedValue(null);
      users.create.mockResolvedValue({ id: 'u2' } as User);
      identities.create.mockRejectedValue(
        new QueryFailedError('insert', [], { code: '23505' } as unknown as Error),
      );

      const result = await service.loginWithGoogle(profile());

      expect(result).toBe(winner);
      expect(identities.findByProvider).toHaveBeenCalledTimes(2);
    });
  });

  describe('buildAuthorizationUrl', () => {
    it('targets the google authorization endpoint with the configured client', () => {
      const url = new URL(service.buildAuthorizationUrl('the-state'));

      expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url.searchParams.get('client_id')).toBe(CONFIG.clientId);
      expect(url.searchParams.get('redirect_uri')).toBe(CONFIG.redirectUri);
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('scope')).toBe('openid email profile');
      expect(url.searchParams.get('state')).toBe('the-state');
    });
  });

  describe('exchangeCode', () => {
    let fetchMock: jest.Mock;

    beforeEach(() => {
      fetchMock = jest.fn();
      global.fetch = fetchMock as typeof fetch;
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('posts the code and maps the token response', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ access_token: 'at', id_token: 'it' }),
      });

      const tokens = await service.exchangeCode('auth-code');

      expect(tokens).toEqual({ accessToken: 'at', idToken: 'it' });

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://oauth2.googleapis.com/token');
      expect(init.method).toBe('POST');
      const body = new URLSearchParams(init.body as string);
      expect(body.get('code')).toBe('auth-code');
      expect(body.get('grant_type')).toBe('authorization_code');
      expect(body.get('client_secret')).toBe(CONFIG.clientSecret);
    });

    it('rejects when the token endpoint responds with an error', async () => {
      fetchMock.mockResolvedValue({ ok: false });

      await expect(service.exchangeCode('auth-code')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('fetchProfile', () => {
    let fetchMock: jest.Mock;

    beforeEach(() => {
      fetchMock = jest.fn();
      global.fetch = fetchMock as typeof fetch;
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('sends a bearer token and maps the profile response', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ sub: 'google-sub', email: 'user@example.com', email_verified: true }),
      });

      const result = await service.fetchProfile('access-token');

      expect(result).toEqual({ sub: 'google-sub', email: 'user@example.com', emailVerified: true });

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://www.googleapis.com/oauth2/v3/userinfo');
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer access-token');
    });

    it('rejects when the userinfo endpoint responds with an error', async () => {
      fetchMock.mockResolvedValue({ ok: false });

      await expect(service.fetchProfile('access-token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
