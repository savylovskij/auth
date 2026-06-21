import type { CookieOptions, Response } from 'express';

export const SESSION_COOKIE = 'session';

export function setSessionCookie(
  response: Response,
  token: string,
  expiresAt: Date,
  isProduction: boolean,
): void {
  const maxAge = expiresAt.getTime() - Date.now();

  response.cookie(SESSION_COOKIE, token, { ...baseCookieOptions(isProduction), maxAge });
}

export function clearSessionCookie(response: Response, isProduction: boolean): void {
  response.clearCookie(SESSION_COOKIE, baseCookieOptions(isProduction));
}

function baseCookieOptions(isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  };
}
