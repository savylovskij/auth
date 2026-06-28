import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Response } from 'express';

import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { Session } from './session.entity';
import { SessionGuard } from './session.guard';
import { SessionsService } from './sessions.service';

function buildContext(cookie?: string): {
  context: ExecutionContext;
  request: AuthenticatedRequest;
  setCookie: jest.Mock;
} {
  const request = { headers: cookie === undefined ? {} : { cookie } } as AuthenticatedRequest;
  const setCookie = jest.fn();
  const response = { cookie: setCookie } as unknown as Response;
  const context = {
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
  } as unknown as ExecutionContext;

  return { context, request, setCookie };
}

describe('SessionGuard', () => {
  let guard: SessionGuard;
  let sessions: jest.Mocked<Pick<SessionsService, 'validate'>>;
  let config: jest.Mocked<Pick<ConfigService, 'get'>>;

  beforeEach(() => {
    sessions = { validate: jest.fn() };
    config = { get: jest.fn().mockReturnValue('test') };
    guard = new SessionGuard(
      config as unknown as ConfigService,
      sessions as unknown as SessionsService,
    );
  });

  it('rejects when no session cookie is present', async () => {
    const { context } = buildContext();

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(sessions.validate).not.toHaveBeenCalled();
  });

  it('rejects when the token does not resolve to a session', async () => {
    sessions.validate.mockResolvedValue(null);
    const { context } = buildContext('session=raw-token');

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(sessions.validate).toHaveBeenCalledWith('raw-token');
  });

  it('attaches the user and session and refreshes the cookie on success', async () => {
    const user = { id: 'u1' };
    const session = { user, expiresAt: new Date('2030-01-01') } as Session;
    sessions.validate.mockResolvedValue(session);
    const { context, request, setCookie } = buildContext('session=raw-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toBe(user);
    expect(request.session).toBe(session);
    expect(setCookie).toHaveBeenCalled();
  });
});
