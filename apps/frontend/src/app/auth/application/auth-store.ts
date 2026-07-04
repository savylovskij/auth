import { computed, inject, Service, signal } from '@angular/core';

import { Observable, tap } from 'rxjs';

import { Credentials } from '../domain/credentials';
import { User } from '../domain/user';
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

  readonly #user = signal<User | null>(null);

  readonly user = this.#user.asReadonly();
  readonly isAuthenticated = computed(() => this.#user() !== null);

  login(credentials: Credentials): Observable<User> {
    return this.loginUseCase.execute(credentials).pipe(tap((user) => this.#user.set(user)));
  }

  register(credentials: Credentials): Observable<User> {
    return this.registerUseCase.execute(credentials).pipe(tap((user) => this.#user.set(user)));
  }

  loadMe(): Observable<User> {
    return this.loadMeUseCase.execute().pipe(tap((user) => this.#user.set(user)));
  }

  logout(): Observable<void> {
    return this.logoutUseCase.execute().pipe(tap(() => this.#user.set(null)));
  }

  logoutAll(): Observable<void> {
    return this.logoutAllUseCase.execute().pipe(tap(() => this.#user.set(null)));
  }

  clear(): void {
    this.#user.set(null);
  }
}
