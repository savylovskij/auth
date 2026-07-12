import { inject } from '@angular/core';
import { CanActivateFn, RedirectCommand, Router } from '@angular/router';

import { AuthStore } from '../application/auth-store';

export const guestGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  const router = inject(Router);

  if (store.isAuthenticated()) {
    return new RedirectCommand(router.createUrlTree(['/profile']), { replaceUrl: true });
  }

  return true;
};
