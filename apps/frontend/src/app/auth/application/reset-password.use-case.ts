import { inject, Service } from '@angular/core';

import { Observable } from 'rxjs';

import { AuthRepository } from '../domain/auth.repository';
import { ResetPassword } from '../domain/reset-password';

@Service()
export class ResetPasswordUseCase {
  private readonly repository = inject(AuthRepository);

  execute(payload: ResetPassword): Observable<void> {
    return this.repository.resetPassword(payload);
  }
}
