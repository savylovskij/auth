import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { catchError, EMPTY, map } from 'rxjs';

import { AuthStore } from '../application/auth-store';

export const authGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  const router = inject(Router);

  const isAuthenticated = store.isAuthenticated();

  if (isAuthenticated) {
    return true;
  }

  return store.loadMe().pipe(
    map(() => true),
    catchError(() => {
      void router.navigate(['/login']);

      return EMPTY;
    }),
  );
};
