import { inject, Service } from '@angular/core';

import { Observable } from 'rxjs';

import { AuthRepository } from '../domain/auth.repository';

@Service()
export class RevokeSessionUseCase {
  private readonly repository = inject(AuthRepository);

  execute(id: string): Observable<void> {
    return this.repository.revokeSession(id);
  }
}
