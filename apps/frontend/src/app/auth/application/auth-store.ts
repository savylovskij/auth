import { computed, inject, Service, signal } from '@angular/core';

import { Observable, tap } from 'rxjs';

import { Credentials } from '../domain/credentials';
import { ResetPassword } from '../domain/reset-password';
import { User } from '../domain/user';
import { AuthState } from './auth-state';
import { AUTH_STATUS } from './auth-status';
import { ForgotPasswordUseCase } from './forgot-password.use-case';
import { LoadMeUseCase } from './load-me.use-case';
import { LoginUseCase } from './login.use-case';
import { LogoutUseCase } from './logout.use-case';
import { LogoutAllUseCase } from './logout-all.use-case';
import { RegisterUseCase } from './register.use-case';
import { ResendVerificationUseCase } from './resend-verification.use-case';
import { ResetPasswordUseCase } from './reset-password.use-case';
import { VerifyEmailUseCase } from './verify-email.use-case';

@Service()
export class AuthStore {
  private readonly loginUseCase = inject(LoginUseCase);
  private readonly registerUseCase = inject(RegisterUseCase);
  private readonly loadMeUseCase = inject(LoadMeUseCase);
  private readonly logoutUseCase = inject(LogoutUseCase);
  private readonly logoutAllUseCase = inject(LogoutAllUseCase);
  private readonly verifyEmailUseCase = inject(VerifyEmailUseCase);
  private readonly resendVerificationUseCase = inject(ResendVerificationUseCase);
  private readonly forgotPasswordUseCase = inject(ForgotPasswordUseCase);
  private readonly resetPasswordUseCase = inject(ResetPasswordUseCase);

  readonly #state = signal<AuthState>({ status: AUTH_STATUS.UNKNOWN });

  readonly user = computed(() => {
    const state = this.#state();

    return state.status === AUTH_STATUS.AUTHENTICATED ? state.user : null;
  });
  readonly isAuthenticated = computed(() => this.#state().status === AUTH_STATUS.AUTHENTICATED);
  readonly isAnonymous = computed(() => this.#state().status === AUTH_STATUS.ANONYMOUS);

  login(credentials: Credentials): Observable<User> {
    return this.loginUseCase
      .execute(credentials)
      .pipe(tap((user) => this.#state.set({ status: AUTH_STATUS.AUTHENTICATED, user })));
  }

  register(credentials: Credentials): Observable<User> {
    return this.registerUseCase
      .execute(credentials)
      .pipe(tap((user) => this.#state.set({ status: AUTH_STATUS.AUTHENTICATED, user })));
  }

  loadMe(): Observable<User> {
    return this.loadMeUseCase
      .execute()
      .pipe(tap((user) => this.#state.set({ status: AUTH_STATUS.AUTHENTICATED, user })));
  }

  verifyEmail(code: string): Observable<User> {
    return this.verifyEmailUseCase
      .execute(code)
      .pipe(tap((user) => this.#state.set({ status: AUTH_STATUS.AUTHENTICATED, user })));
  }

  resendVerification(): Observable<void> {
    return this.resendVerificationUseCase.execute();
  }

  forgotPassword(email: string): Observable<void> {
    return this.forgotPasswordUseCase.execute(email);
  }

  resetPassword(payload: ResetPassword): Observable<void> {
    return this.resetPasswordUseCase.execute(payload);
  }

  logout(): Observable<void> {
    return this.logoutUseCase
      .execute()
      .pipe(tap(() => this.#state.set({ status: AUTH_STATUS.ANONYMOUS })));
  }

  logoutAll(): Observable<void> {
    return this.logoutAllUseCase
      .execute()
      .pipe(tap(() => this.#state.set({ status: AUTH_STATUS.ANONYMOUS })));
  }

  clear(): void {
    this.#state.set({ status: AUTH_STATUS.ANONYMOUS });
  }
}
