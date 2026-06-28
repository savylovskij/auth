import { Observable } from 'rxjs';

import { Credentials } from './credentials';
import { User } from './user';

export abstract class AuthRepository {
  abstract register(credentials: Credentials): Observable<User>;
  abstract login(credentials: Credentials): Observable<User>;
  abstract me(): Observable<User>;
  abstract logout(): Observable<void>;
  abstract logoutAll(): Observable<void>;
}
