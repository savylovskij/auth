import { BadRequestException, Controller, Get, Headers, Ip, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Response } from 'express';

import { Cookie } from '../../common/cookie.decorator';
import { SessionsService } from '../../sessions/sessions.service';
import { setSessionCookie } from '../session-cookie';
import { GoogleService } from './google.service';
import { clearStateCookie, OAUTH_STATE_COOKIE, setStateCookie } from './google-cookie';

@Controller('auth/google')
export class GoogleController {
  constructor(
    private readonly google: GoogleService,
    private readonly sessions: SessionsService,
    private readonly config: ConfigService,
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
    @Cookie(OAUTH_STATE_COOKIE) expectedState: string | null,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Res() response: Response,
  ): Promise<void> {
    if (!state || !expectedState || state !== expectedState) {
      throw new BadRequestException('Invalid OAuth state');
    }

    clearStateCookie(response, this.isProduction);

    if (!code) {
      throw new BadRequestException('Missing authorization code');
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

    response.redirect('/auth/me');
  }

  private get isProduction(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }
}
