import { inject, Service } from '@angular/core';

import { Observable } from 'rxjs';

import { AuthRepository } from '../domain/auth.repository';
import { EmailVerification } from '../domain/email-verification';
import { User } from '../domain/user';

@Service()
export class VerifyEmailUseCase {
  private readonly repository = inject(AuthRepository);

  execute(verification: EmailVerification): Observable<User> {
    return this.repository.verifyEmail(verification);
  }
}
