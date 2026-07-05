import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

import { catchError, throwError } from 'rxjs';

import { AuthStore } from '../application/auth-store';
import { SKIP_AUTH_REDIRECT } from '../shared/auth-http.context';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(AuthStore);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        store.clear();

        if (!req.context.get(SKIP_AUTH_REDIRECT)) {
          void router.navigate(['/login']);
        }
      }

      return throwError(() => error);
    }),
  );
};
