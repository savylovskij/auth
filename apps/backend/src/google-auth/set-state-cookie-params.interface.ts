import type { Response } from 'express';

export interface SetStateCookieParams {
  response: Response;
  state: string;
  isProduction: boolean;
}
