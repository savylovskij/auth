import type { CookieOptions, Response } from 'express';

import { baseCookieOptions } from './cookie-options';
import type { SetPendingRegistrationCookieParams } from './set-pending-registration-cookie-params.interface';

export const PENDING_REGISTRATION_COOKIE = 'pending_registration';

const PENDING_REGISTRATION_MAX_AGE = 10 * 60 * 1000;

function pendingRegistrationCookieOptions(isProduction: boolean): CookieOptions {
  return {
    ...baseCookieOptions(isProduction),
    sameSite: 'strict',
  };
}

export function setPendingRegistrationCookie({
  response,
  token,
  isProduction,
}: SetPendingRegistrationCookieParams): void {
  response.cookie(PENDING_REGISTRATION_COOKIE, token, {
    ...pendingRegistrationCookieOptions(isProduction),
    maxAge: PENDING_REGISTRATION_MAX_AGE,
  });
}

export function clearPendingRegistrationCookie(response: Response, isProduction: boolean): void {
  response.clearCookie(PENDING_REGISTRATION_COOKIE, pendingRegistrationCookieOptions(isProduction));
}
