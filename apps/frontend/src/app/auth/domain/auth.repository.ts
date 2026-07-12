import { Observable } from 'rxjs';

import { Credentials } from './credentials';
import { ResetPassword } from './reset-password';
import { Session } from './session';
import { User } from './user';

export abstract class AuthRepository {
  abstract register(credentials: Credentials): Observable<User>;
  abstract login(credentials: Credentials): Observable<User>;
  abstract me(): Observable<User>;
  abstract verifyEmail(code: string): Observable<User>;
  abstract resendVerification(): Observable<void>;
  abstract forgotPassword(email: string): Observable<void>;
  abstract resetPassword(payload: ResetPassword): Observable<void>;
  abstract logout(): Observable<void>;
  abstract logoutAll(): Observable<void>;
  abstract sessions(): Observable<Session[]>;
  abstract revokeSession(id: string): Observable<void>;
}
