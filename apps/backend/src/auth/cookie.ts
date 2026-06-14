import type { CookieOptions } from 'express';

export const SESSION_COOKIE = 'session';

export function sessionCookieOptions(maxAgeMs: number, isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
  };
}
