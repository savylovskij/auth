import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Request, Response } from 'express';

import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { SESSION_COOKIE, setSessionCookie } from '../auth/cookie';
import { SessionsService } from './sessions.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly sessions: SessionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.readToken(request);

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
    setSessionCookie(response, token, session.expiresAt, isProduction);

    return true;
  }

  private readToken(request: Request): string | null {
    const cookie = request.headers.cookie;

    if (!cookie) {
      return null;
    }

    for (const part of cookie.split(';')) {
      const [name, ...rest] = part.trim().split('=');

      if (name === SESSION_COOKIE) {
        return decodeURIComponent(rest.join('='));
      }
    }

    return null;
  }
}
