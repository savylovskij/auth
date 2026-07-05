import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  email,
  form,
  FormField,
  maxLength,
  minLength,
  required,
  submit,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';

import { firstValueFrom } from 'rxjs';

import { AuthStore } from '../../application/auth-store';

@Component({
  selector: 'app-register',
  templateUrl: './register.html',
  styleUrl: './register.css',
  imports: [FormField, RouterLink],
})
export class Register {
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);

  readonly model = signal({ email: '', password: '' });
  readonly serverError = signal<string | null>(null);

  readonly registerForm = form(this.model, (path) => {
    required(path.email, { message: 'Email is required' });
    email(path.email, { message: 'Enter a valid email address' });
    required(path.password, { message: 'Password is required' });
    minLength(path.password, 8, { message: 'Password must be at least 8 characters' });
    maxLength(path.password, 64, { message: 'Password must be at most 64 characters' });
  });

  onSubmit(event: Event): void {
    event.preventDefault();
    this.serverError.set(null);

    void submit(this.registerForm, async () => {
      try {
        await firstValueFrom(this.store.register(this.model()));
        await this.router.navigate(['/profile']);
      } catch (error) {
        if (error instanceof HttpErrorResponse && error.status === HttpStatusCode.Conflict) {
          this.serverError.set('This email is already registered');
        } else if (
          error instanceof HttpErrorResponse &&
          error.status === HttpStatusCode.TooManyRequests
        ) {
          this.serverError.set('Too many attempts. Try again later');
        } else {
          this.serverError.set('Could not create account');
        }
      }
    });
  }
}
