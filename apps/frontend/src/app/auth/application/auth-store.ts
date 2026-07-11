import { computed, inject, Service, signal } from '@angular/core';

import { Observable, tap } from 'rxjs';

import { Credentials } from '../domain/credentials';
import { User } from '../domain/user';
import { AuthState } from './auth-state';
import { AUTH_STATUS } from './auth-status';
import { LoadMeUseCase } from './load-me.use-case';
import { LoginUseCase } from './login.use-case';
import { LogoutUseCase } from './logout.use-case';
import { LogoutAllUseCase } from './logout-all.use-case';
import { RegisterUseCase } from './register.use-case';

@Service()
export class AuthStore {
  private readonly loginUseCase = inject(LoginUseCase);
  private readonly registerUseCase = inject(RegisterUseCase);
  private readonly loadMeUseCase = inject(LoadMeUseCase);
  private readonly logoutUseCase = inject(LogoutUseCase);
  private readonly logoutAllUseCase = inject(LogoutAllUseCase);

  readonly #state = signal<AuthState>({ status: AUTH_STATUS.UNKNOWN });

  readonly user = computed(() => {
    const state = this.#state();

    return state.status === AUTH_STATUS.AUTHENTICATED ? state.user : null;
  });
  readonly isAuthenticated = computed(() => this.#state().status === AUTH_STATUS.AUTHENTICATED);
  readonly isAnonymous = computed(() => this.#state().status === AUTH_STATUS.ANONYMOUS);
  readonly isVerified = computed(() => {
    const state = this.#state();

    return state.status === AUTH_STATUS.AUTHENTICATED && state.user.emailVerified;
  });

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
