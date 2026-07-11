import type { Response } from 'express';

import { baseCookieOptions } from './cookie-options';
import type { SetSessionCookieParams } from './set-session-cookie-params.interface';

export function sessionCookieName(isProduction: boolean): string {
  return isProduction ? '__Host-session' : 'session';
}

export function setSessionCookie({
  response,
  token,
  expiresAt,
  isProduction,
}: SetSessionCookieParams): void {
  response.cookie(sessionCookieName(isProduction), token, {
    ...baseCookieOptions(isProduction),
    maxAge: expiresAt.getTime() - Date.now(),
  });
}

export function clearSessionCookie(response: Response, isProduction: boolean): void {
  response.clearCookie(sessionCookieName(isProduction), baseCookieOptions(isProduction));
}
