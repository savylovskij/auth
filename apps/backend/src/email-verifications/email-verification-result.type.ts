import { EMAIL_VERIFICATION_RESULT } from './email-verification-result.constant';

export type EmailVerificationResult =
  (typeof EMAIL_VERIFICATION_RESULT)[keyof typeof EMAIL_VERIFICATION_RESULT];
