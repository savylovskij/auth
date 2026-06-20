import { AUTH_PROVIDER_LIST } from './auth-provider.constant';

export type AuthProvider = (typeof AUTH_PROVIDER_LIST)[keyof typeof AUTH_PROVIDER_LIST];
