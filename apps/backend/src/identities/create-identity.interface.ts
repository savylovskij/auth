import { AuthProvider } from './auth-provider.type';

export interface CreateIdentityParams {
  userId: string;
  provider: AuthProvider;
  providerId: string;
  passwordHash?: string | null;
}
