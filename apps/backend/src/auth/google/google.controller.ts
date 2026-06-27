import { BadRequestException, Controller, Get, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Response } from 'express';

import { Cookie } from '../../common/cookie.decorator';
import { GoogleService } from './google.service';
import { clearStateCookie, OAUTH_STATE_COOKIE, setStateCookie } from './google-cookie';
import { GoogleProfile } from './google-profile.interface';

@Controller('auth/google')
export class GoogleController {
  constructor(
    private readonly google: GoogleService,
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
    @Res({ passthrough: true }) response: Response,
  ): Promise<GoogleProfile> {
    if (!state || !expectedState || state !== expectedState) {
      throw new BadRequestException('Invalid OAuth state');
    }

    clearStateCookie(response, this.isProduction);

    if (!code) {
      throw new BadRequestException('Missing authorization code');
    }

    const tokens = await this.google.exchangeCode(code);

    return this.google.fetchProfile(tokens.accessToken);
  }

  private get isProduction(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }
}
