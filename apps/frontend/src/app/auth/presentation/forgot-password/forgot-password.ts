import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { email, form, FormField, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';

import { firstValueFrom } from 'rxjs';

import { AuthStore } from '../../application/auth-store';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
  imports: [FormField, RouterLink],
})
export class ForgotPassword {
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);

  readonly model = signal({ email: '' });
  readonly serverError = signal<string | null>(null);

  readonly forgotForm = form(this.model, (path) => {
    required(path.email, { message: 'Email is required' });
    email(path.email, { message: 'Enter a valid email address' });
  });

  onSubmit(event: Event): void {
    event.preventDefault();
    this.serverError.set(null);

    void submit(this.forgotForm, async () => {
      try {
        await firstValueFrom(this.store.forgotPassword(this.model().email));
        await this.router.navigate(['/reset-password'], {
          queryParams: { email: this.model().email },
        });
      } catch (error) {
        if (error instanceof HttpErrorResponse && error.status === HttpStatusCode.TooManyRequests) {
          this.serverError.set('Too many attempts. Try again later');
        } else {
          this.serverError.set('Could not send the reset code');
        }
      }
    });
  }
}
