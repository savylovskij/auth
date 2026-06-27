import type { Response } from 'express';

import { baseCookieOptions } from './cookie-options';
import type { SetSessionCookieParams } from './set-session-cookie-params.interface';

export const SESSION_COOKIE = 'session';

export function setSessionCookie({
  response,
  token,
  expiresAt,
  isProduction,
}: SetSessionCookieParams): void {
  response.cookie(SESSION_COOKIE, token, {
    ...baseCookieOptions(isProduction),
    maxAge: expiresAt.getTime() - Date.now(),
  });
}

export function clearSessionCookie(response: Response, isProduction: boolean): void {
  response.clearCookie(SESSION_COOKIE, baseCookieOptions(isProduction));
}
