import { inject } from '@angular/core';
import { CanActivateFn, RedirectCommand, Router } from '@angular/router';

import { catchError, map, of } from 'rxjs';

import { AuthStore } from '../application/auth-store';

export const guestGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  const router = inject(Router);

  if (store.isAuthenticated()) {
    return new RedirectCommand(router.createUrlTree(['/profile']), { replaceUrl: true });
  }

  return store.loadMe().pipe(
    map(() => new RedirectCommand(router.createUrlTree(['/profile']), { replaceUrl: true })),
    catchError(() => of(true)),
  );
};
