import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { SessionsService } from '../sessions/sessions.service';
import type { Session } from '../sessions/session.entity';
import type { AuthenticatedRequest } from './authenticated-request';
import { SESSION_COOKIE, sessionCookieOptions } from './cookie';

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
    this.refreshCookie(response, token, session);

    return true;
  }

  private refreshCookie(response: Response, token: string, session: Session): void {
    const maxAge = session.expiresAt.getTime() - Date.now();
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';

    response.cookie(SESSION_COOKIE, token, sessionCookieOptions(maxAge, isProduction));
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
