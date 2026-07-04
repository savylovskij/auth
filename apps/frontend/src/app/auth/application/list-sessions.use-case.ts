import { inject, Service } from '@angular/core';

import { Observable } from 'rxjs';

import { AuthRepository } from '../domain/auth.repository';
import { Session } from '../domain/session';

@Service()
export class ListSessionsUseCase {
  private readonly repository = inject(AuthRepository);

  execute(): Observable<Session[]> {
    return this.repository.sessions();
  }
}
