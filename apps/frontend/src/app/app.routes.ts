import { Routes } from '@angular/router';

import { authGuard } from './auth/presentation/auth.guard';
import { emailQueryParamGuard } from './auth/presentation/email-query-param.guard';
import { guestGuard } from './auth/presentation/guest.guard';
import { verifiedGuard } from './auth/presentation/verified.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/presentation/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/presentation/register/register').then((m) => m.Register),
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./auth/presentation/forgot-password/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    path: 'reset-password',
    canActivate: [guestGuard, emailQueryParamGuard],
    loadComponent: () =>
      import('./auth/presentation/reset-password/reset-password').then((m) => m.ResetPassword),
  },
  {
    path: 'verify-email',
    canActivate: [guestGuard, emailQueryParamGuard],
    loadComponent: () =>
      import('./auth/presentation/verify-email/verify-email').then((m) => m.VerifyEmail),
  },
  {
    path: 'profile',
    canActivate: [authGuard, verifiedGuard],
    loadComponent: () => import('./auth/presentation/profile/profile').then((m) => m.Profile),
  },
  {
    path: 'sessions',
    canActivate: [authGuard, verifiedGuard],
    loadComponent: () => import('./auth/presentation/sessions/sessions').then((m) => m.Sessions),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
