import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Response } from 'express';

import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { SESSION_COOKIE, setSessionCookie } from '../auth/session-cookie';
import { readCookie } from '../common/read-cookie';
import { SessionsService } from './sessions.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly sessions: SessionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = readCookie(request, SESSION_COOKIE);

    if (!token) {
      throw new UnauthorizedException();
    }

    const session = await this.sessions.validate(token);

    if (!session) {
      throw new UnauthorizedException();
    }

    request.user = session.user;
    request.session = session;

    const response = context.switchToHttp().getResponse<Response>();
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';
    setSessionCookie({ response, token, expiresAt: session.expiresAt, isProduction });

    return true;
  }
}
