import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { firstValueFrom } from 'rxjs';

import { AuthStore } from '../../application/auth-store';
import { SessionsStore } from '../../application/sessions-store';

@Component({
  selector: 'app-sessions',
  templateUrl: './sessions.html',
  styleUrl: './sessions.css',
  imports: [DatePipe],
})
export class Sessions implements OnInit {
  private readonly sessionsStore = inject(SessionsStore);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly sessions = this.sessionsStore.sessions;

  ngOnInit(): void {
    this.sessionsStore.load().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  async revoke(id: string): Promise<void> {
    await firstValueFrom(this.sessionsStore.revoke(id));
  }

  logoutAll(): void {
    this.authStore
      .logoutAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        void this.router.navigate(['/login']);
      });
  }
}
