import { Component, inject, signal } from '@angular/core';
import { email, form, FormField, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { firstValueFrom } from 'rxjs';

import { AuthStore } from '../../application/auth-store';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.css',
  imports: [FormField, RouterLink],
})
export class Login {
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly model = signal({ email: '', password: '' });
  readonly serverError = signal<string | null>(
    this.route.snapshot.queryParamMap.get('error') === 'google'
      ? 'Google sign-in was cancelled or failed'
      : null,
  );

  readonly loginForm = form(this.model, (path) => {
    required(path.email, { message: 'Email is required' });
    email(path.email, { message: 'Enter a valid email address' });
    required(path.password, { message: 'Password is required' });
  });

  onSubmit(event: Event): void {
    event.preventDefault();
    this.serverError.set(null);

    void submit(this.loginForm, async () => {
      try {
        await firstValueFrom(this.store.login(this.model()));
        await this.router.navigate(['/profile']);
      } catch {
        this.serverError.set('Invalid email or password');
      }
    });
  }
}
