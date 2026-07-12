import { PASSWORD_RESET_RESULT } from './password-reset-result.constant';

export type PasswordResetResult =
  (typeof PASSWORD_RESET_RESULT)[keyof typeof PASSWORD_RESET_RESULT];
