import { Controller, Get, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Response } from 'express';

import { GoogleService } from './google.service';
import { setStateCookie } from './google-cookie';

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

  private get isProduction(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }
}
