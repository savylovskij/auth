import { inject, Service } from '@angular/core';

import { Observable } from 'rxjs';

import { AuthRepository } from '../domain/auth.repository';

@Service()
export class LogoutUseCase {
  private readonly repository = inject(AuthRepository);

  execute(): Observable<void> {
    return this.repository.logout();
  }
}
