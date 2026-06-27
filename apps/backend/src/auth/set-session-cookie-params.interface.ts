import type { Response } from 'express';

export interface SetSessionCookieParams {
  response: Response;
  token: string;
  expiresAt: Date;
  isProduction: boolean;
}
