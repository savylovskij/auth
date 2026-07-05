import { User } from '../domain/user';
import { AUTH_STATUS } from './auth-status';

export type AuthState =
  | { status: typeof AUTH_STATUS.UNKNOWN }
  | { status: typeof AUTH_STATUS.ANONYMOUS }
  | { status: typeof AUTH_STATUS.AUTHENTICATED; user: User };
