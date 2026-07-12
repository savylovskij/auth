import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  email,
  form,
  FormField,
  maxLength,
  minLength,
  pattern,
  required,
  submit,
} from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { firstValueFrom } from 'rxjs';

import { AuthStore } from '../../application/auth-store';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
  imports: [FormField, RouterLink],
})
export class ResetPassword {
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly email = this.route.snapshot.queryParamMap.get('email') ?? '';

  readonly model = signal({
    email: this.email,
    code: '',
    newPassword: '',
  });
  readonly serverError = signal<string | null>(null);

  readonly resetForm = form(this.model, (path) => {
    required(path.email, { message: 'Email is required' });
    email(path.email, { message: 'Enter a valid email address' });
    required(path.code, { message: 'Code is required' });
    pattern(path.code, /^\d{6}$/, { message: 'Enter the 6-digit code' });
    required(path.newPassword, { message: 'Password is required' });
    minLength(path.newPassword, 8, { message: 'Password must be at least 8 characters' });
    maxLength(path.newPassword, 64, { message: 'Password must be at most 64 characters' });
  });

  onSubmit(event: Event): void {
    event.preventDefault();
    this.serverError.set(null);

    void submit(this.resetForm, async () => {
      try {
        await firstValueFrom(this.store.resetPassword(this.model()));
        await this.router.navigate(['/login']);
      } catch (error) {
        if (error instanceof HttpErrorResponse && error.status === HttpStatusCode.TooManyRequests) {
          this.serverError.set('Too many attempts. Try again later');
        } else {
          this.serverError.set('Invalid or expired code. Request a new one');
        }
      }
    });
  }
}
