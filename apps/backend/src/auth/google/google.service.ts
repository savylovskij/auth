import { randomBytes } from 'node:crypto';

import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';

import { googleConfig } from './google.config';
import type { GoogleProfile } from './google-profile.interface';
import type { GoogleTokens } from './google-tokens.interface';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const GOOGLE_SCOPES = ['openid', 'email', 'profile'];

@Injectable()
export class GoogleService {
  constructor(
    @Inject(googleConfig.KEY)
    private readonly config: ConfigType<typeof googleConfig>,
  ) {}

  createState(): string {
    return randomBytes(32).toString('base64url');
  }

  buildAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: GOOGLE_SCOPES.join(' '),
      state,
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<GoogleTokens> {
    const params = new URLSearchParams({
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new UnauthorizedException('Failed to exchange authorization code');
    }

    const data = (await response.json()) as { access_token: string; id_token: string };

    return { accessToken: data.access_token, idToken: data.id_token };
  }

  async fetchProfile(accessToken: string): Promise<GoogleProfile> {
    const response = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new UnauthorizedException('Failed to fetch Google profile');
    }

    const data = (await response.json()) as {
      sub: string;
      email: string;
      email_verified: boolean;
    };

    return { sub: data.sub, email: data.email, emailVerified: data.email_verified };
  }
}
