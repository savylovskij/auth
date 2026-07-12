import { inject } from '@angular/core';
import { CanActivateFn, RedirectCommand, Router } from '@angular/router';

import { AuthStore } from '../application/auth-store';

export const unverifiedGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  const router = inject(Router);

  const user = store.user();

  if (user?.emailVerified) {
    return new RedirectCommand(router.createUrlTree(['/profile']), { replaceUrl: true });
  }

  return true;
};
