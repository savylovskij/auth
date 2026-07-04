import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withExperimentalAutoCleanupInjectors } from '@angular/router';

import { routes } from './app.routes';
import { AuthHttpRepository } from './auth/data/auth-http.repository';
import { AuthRepository } from './auth/domain/auth.repository';
import { authInterceptor } from './auth/presentation/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withExperimentalAutoCleanupInjectors()),
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: AuthRepository,
      useClass: AuthHttpRepository,
    },
  ],
};
