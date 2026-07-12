import { inject, Service } from '@angular/core';

import { Observable } from 'rxjs';

import { AuthRepository } from '../domain/auth.repository';

@Service()
export class ResendVerificationUseCase {
  private readonly repository = inject(AuthRepository);

  execute(email: string): Observable<void> {
    return this.repository.resendVerification(email);
  }
}
