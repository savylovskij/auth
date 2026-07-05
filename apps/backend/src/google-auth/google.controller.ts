import { Controller, Get, Headers, Inject, Ip, Query, Res } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';

import type { Response } from 'express';

import { appConfig } from '../app.config';
import { setSessionCookie } from '../auth/session-cookie';
import { Cookie } from '../common/cookie.decorator';
import { SessionsService } from '../sessions/sessions.service';
import { GoogleService } from './google.service';
import { clearStateCookie, OAUTH_STATE_COOKIE, setStateCookie } from './google-cookie';

@Controller('auth/google')
export class GoogleController {
  constructor(
    private readonly google: GoogleService,
    private readonly sessions: SessionsService,
    private readonly config: ConfigService,
    @Inject(appConfig.KEY) private readonly app: ConfigType<typeof appConfig>,
  ) {}

  @Get()
  start(@Res() response: Response): void {
    const state = this.google.createState();
    const url = this.google.buildAuthorizationUrl(state);

    setStateCookie({ response, state, isProduction: this.isProduction });

    response.redirect(url);
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string | null,
    @Cookie(OAUTH_STATE_COOKIE) expectedState: string | null,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Res() response: Response,
  ): Promise<void> {
    clearStateCookie(response, this.isProduction);

    const stateValid = Boolean(state && expectedState && state === expectedState);

    if (!stateValid || error || !code) {
      response.redirect(`${this.app.frontendUrl}/login?error=google`);
      return;
    }

    const tokens = await this.google.exchangeCode(code);
    const profile = await this.google.fetchProfile(tokens.accessToken);
    const user = await this.google.loginWithGoogle(profile);

    const { token, session } = await this.sessions.create(user.id, {
      userAgent: userAgent ?? null,
      ip: ip ?? null,
    });

    setSessionCookie({
      response,
      token,
      expiresAt: session.expiresAt,
      isProduction: this.isProduction,
    });

    response.redirect(`${this.app.frontendUrl}/profile`);
  }

  private get isProduction(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }
}
