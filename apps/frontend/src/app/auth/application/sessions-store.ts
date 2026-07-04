import { inject, Service, signal } from '@angular/core';

import { Observable, tap } from 'rxjs';

import { Session } from '../domain/session';
import { ListSessionsUseCase } from './list-sessions.use-case';
import { RevokeSessionUseCase } from './revoke-session.use-case';

@Service()
export class SessionsStore {
  private readonly listSessionsUseCase = inject(ListSessionsUseCase);
  private readonly revokeSessionUseCase = inject(RevokeSessionUseCase);

  readonly #sessions = signal<Session[]>([]);

  readonly sessions = this.#sessions.asReadonly();

  load(): Observable<Session[]> {
    return this.listSessionsUseCase.execute().pipe(tap((sessions) => this.#sessions.set(sessions)));
  }

  revoke(id: string): Observable<void> {
    return this.revokeSessionUseCase
      .execute(id)
      .pipe(
        tap(() =>
          this.#sessions.update((sessions) => sessions.filter((session) => session.id !== id)),
        ),
      );
  }
}
