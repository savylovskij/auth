import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { form, FormField, pattern, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';

import { firstValueFrom } from 'rxjs';

import { AuthStore } from '../../application/auth-store';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.css',
  imports: [FormField],
})
export class VerifyEmail {
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly email = this.route.snapshot.queryParamMap.get('email') ?? '';

  readonly model = signal({ code: '' });
  readonly serverError = signal<string | null>(null);
  readonly info = signal<string | null>(null);

  readonly verifyForm = form(this.model, (path) => {
    required(path.code, { message: 'Code is required' });
    pattern(path.code, /^\d{6}$/, { message: 'Enter the 6-digit code' });
  });

  onSubmit(event: Event): void {
    event.preventDefault();
    this.serverError.set(null);
    this.info.set(null);

    void submit(this.verifyForm, async () => {
      try {
        await firstValueFrom(
          this.store.verifyEmail({ email: this.email, code: this.model().code }),
        );
        await this.router.navigate(['/profile']);
      } catch (error) {
        if (error instanceof HttpErrorResponse && error.status === HttpStatusCode.TooManyRequests) {
          this.serverError.set('Too many attempts. Try again later');
        } else {
          this.serverError.set('Invalid or expired code. Request a new one');
        }
      }
    });
  }

  async resend(): Promise<void> {
    this.serverError.set(null);
    this.info.set(null);

    try {
      await firstValueFrom(this.store.resendVerification(this.email));
      this.info.set('A new code has been sent to your email');
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === HttpStatusCode.TooManyRequests) {
        this.serverError.set('Too many attempts. Try again later');
      } else {
        this.serverError.set('Could not resend the code');
      }
    }
  }
}
