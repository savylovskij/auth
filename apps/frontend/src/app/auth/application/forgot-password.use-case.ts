import { inject, Service } from '@angular/core';

import { Observable } from 'rxjs';

import { AuthRepository } from '../domain/auth.repository';

@Service()
export class ForgotPasswordUseCase {
  private readonly repository = inject(AuthRepository);

  execute(email: string): Observable<void> {
    return this.repository.forgotPassword(email);
  }
}
