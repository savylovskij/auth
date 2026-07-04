import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { firstValueFrom } from 'rxjs';

import { AuthStore } from '../../application/auth-store';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);

  readonly user = this.store.user;

  async logout(): Promise<void> {
    await firstValueFrom(this.store.logout());
    await this.router.navigate(['/login']);
  }
}
