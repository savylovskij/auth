import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { AuthRepository } from '../domain/auth.repository';
import { Credentials } from '../domain/credentials';
import { ResetPassword } from '../domain/reset-password';
import { Session } from '../domain/session';
import { User } from '../domain/user';
import { SKIP_AUTH_REDIRECT } from '../shared/auth-http.context';

@Injectable()
export class AuthHttpRepository implements AuthRepository {
  private readonly http = inject(HttpClient);

  register(credentials: Credentials): Observable<User> {
    return this.http.post<User>('/auth/register', credentials, { withCredentials: true });
  }

  login(credentials: Credentials): Observable<User> {
    return this.http.post<User>('/auth/login', credentials, { withCredentials: true });
  }

  me(): Observable<User> {
    return this.http.get<User>('/auth/me', {
      withCredentials: true,
      context: new HttpContext().set(SKIP_AUTH_REDIRECT, true),
    });
  }

  verifyEmail(code: string): Observable<User> {
    return this.http.post<User>('/auth/verify-email', { code }, { withCredentials: true });
  }

  resendVerification(): Observable<void> {
    return this.http.post<void>('/auth/verify-email/resend', null, { withCredentials: true });
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>('/auth/forgot-password', { email }, { withCredentials: true });
  }

  resetPassword(payload: ResetPassword): Observable<void> {
    return this.http.post<void>('/auth/reset-password', payload, { withCredentials: true });
  }

  logout(): Observable<void> {
    return this.http.post<void>('/auth/logout', null, { withCredentials: true });
  }

  logoutAll(): Observable<void> {
    return this.http.post<void>('/auth/logout-all', null, { withCredentials: true });
  }

  sessions(): Observable<Session[]> {
    return this.http.get<Session[]>('/auth/sessions', { withCredentials: true });
  }

  revokeSession(id: string): Observable<void> {
    return this.http.delete<void>(`/auth/sessions/${id}`, { withCredentials: true });
  }
}
