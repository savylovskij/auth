import { inject, Service } from '@angular/core';

import { Observable } from 'rxjs';

import { AuthRepository } from '../domain/auth.repository';
import { User } from '../domain/user';

@Service()
export class LoadMeUseCase {
  private readonly repository = inject(AuthRepository);

  execute(): Observable<User> {
    return this.repository.me();
  }
}
