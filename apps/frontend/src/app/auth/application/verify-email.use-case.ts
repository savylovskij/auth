import { inject, Service } from '@angular/core';

import { Observable } from 'rxjs';

import { AuthRepository } from '../domain/auth.repository';
import { User } from '../domain/user';

@Service()
export class VerifyEmailUseCase {
  private readonly repository = inject(AuthRepository);

  execute(code: string): Observable<User> {
    return this.repository.verifyEmail(code);
  }
}
