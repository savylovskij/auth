import { inject, Service } from '@angular/core';

import { Observable } from 'rxjs';

import { AuthRepository } from '../domain/auth.repository';
import { Credentials } from '../domain/credentials';
import { User } from '../domain/user';

@Service()
export class RegisterUseCase {
  private readonly repository = inject(AuthRepository);

  execute(credentials: Credentials): Observable<User> {
    return this.repository.register(credentials);
  }
}
