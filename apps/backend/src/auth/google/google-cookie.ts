import type { Response } from 'express';

import { baseCookieOptions } from '../cookie-options';
import type { SetStateCookieParams } from './set-state-cookie-params.interface';

export const OAUTH_STATE_COOKIE = 'oauth_state';

const OAUTH_STATE_MAX_AGE = 10 * 60 * 1000;

export function setStateCookie({ response, state, isProduction }: SetStateCookieParams): void {
  response.cookie(OAUTH_STATE_COOKIE, state, {
    ...baseCookieOptions(isProduction),
    maxAge: OAUTH_STATE_MAX_AGE,
  });
}

export function clearStateCookie(response: Response, isProduction: boolean): void {
  response.clearCookie(OAUTH_STATE_COOKIE, baseCookieOptions(isProduction));
}
