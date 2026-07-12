import { inject } from '@angular/core';
import { CanActivateFn, RedirectCommand, Router } from '@angular/router';

export const emailQueryParamGuard: CanActivateFn = (route) => {
  const router = inject(Router);

  if (route.queryParamMap.get('email')) {
    return true;
  }

  return new RedirectCommand(router.createUrlTree(['/login']), { replaceUrl: true });
};
