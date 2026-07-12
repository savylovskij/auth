import { PENDING_REGISTRATION_RESULT } from './pending-registration-result.constant';

export type PendingRegistrationResult =
  (typeof PENDING_REGISTRATION_RESULT)[keyof typeof PENDING_REGISTRATION_RESULT];
