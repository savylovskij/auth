import type { Response } from 'express';

export interface SetPendingRegistrationCookieParams {
  response: Response;
  token: string;
  isProduction: boolean;
}
