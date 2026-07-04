import { Routes } from '@angular/router';

import { authGuard } from './auth/presentation/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/presentation/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./auth/presentation/register/register').then((m) => m.Register),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./auth/presentation/profile/profile').then((m) => m.Profile),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
