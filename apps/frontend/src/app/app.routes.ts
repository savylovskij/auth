import { Routes } from '@angular/router';

import { authGuard } from './auth/presentation/auth.guard';
import { guestGuard } from './auth/presentation/guest.guard';

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
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./auth/presentation/profile/profile').then((m) => m.Profile),
  },
  {
    path: 'sessions',
    canActivate: [authGuard],
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
