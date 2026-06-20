import type { CookieOptions, Response } from 'express';

export const SESSION_COOKIE = 'session';

export function setSessionCookie(
  response: Response,
  token: string,
  expiresAt: Date,
  isProduction: boolean,
): void {
  const maxAge = expiresAt.getTime() - Date.now();

  response.cookie(SESSION_COOKIE, token, sessionCookieOptions(maxAge, isProduction));
}

function sessionCookieOptions(maxAgeMs: number, isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
  };
}
