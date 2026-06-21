# Plan: what's left to do

This document captures the current state of the project and the remaining steps.
We work in small steps — one step, then review, then the next.

## Architecture (reminder)

- Authorization via **email + Google OAuth**.
- **Native APIs only**, no third-party auth libraries (no Passport,
  no express-session).
- **Cookies + server-side sessions** (stateful), sessions stored in a Postgres
  table.
- DB schema **only via TypeORM migrations**, no `synchronize`, no seed.

## Done

- [x] Monorepo (pnpm), NestJS backend, Angular frontend.
- [x] ESLint + Prettier + Husky, import sorting (simple-import-sort) on both
      backend and frontend.
- [x] PostgreSQL in Docker, DB config via `registerAs` + zod.
- [x] Migration infrastructure (dev + prod).
- [x] `User` entity + migration.
- [x] `Session` entity + migration.
- [x] `SessionsService`: create, validate, revoke, hybrid lifetime
      (sliding idle + absolute cap, lazy renewal).
- [x] Cookie helpers, `SessionGuard`, `@CurrentUser`, `GET /auth/me`.
- [x] `@Serialize(dto)` interceptor for responses (class-transformer).

## Step 1. Email registration and login (done)

Decisions taken:

- Password hashing: **argon2** (argon2id, OWASP).
- Normalize email to lowercase + trim.
- Credentials live in an `identities` table (provider/providerId/passwordHash);
  `users` holds the profile only (extensible for Google later).

Substeps:

- [x] `Identity` entity + migration (instead of a `passwordHash` column on `users`).
- [x] Global `ValidationPipe` via `APP_PIPE` (`whitelist: true`) +
      class-validator.
- [x] DTOs: `RegisterDto`, `LoginDto` (email/password validation).
- [x] `AuthService`: `register`, `login` (password check, email normalization).
- [x] Endpoints: `POST /auth/register`, `POST /auth/login` — create a session and
      set the cookie.
- [x] `POST /auth/logout` (revoke the current session + clear the cookie).
- [x] `POST /auth/logout-all` (revoke all sessions of the user).

## Step 2. Session management (done)

- [x] `GET /auth/sessions` — list the user's active sessions
      (userAgent, ip, createdAt, expiresAt, current — yes/no).
- [x] `DELETE /auth/sessions/:id` — revoke a specific session (scoped to owner).
- [x] Extracted `SessionsController` + `SessionGuard` into `SessionsModule`;
      added `@CurrentSession` decorator.

## Step 3. Google OAuth (native)

- [ ] Config (client id/secret, redirect URI) via env + zod.
- [ ] `GET /auth/google` — redirect to Google with `state` (CSRF) + scope.
- [ ] `GET /auth/google/callback` — exchange `code` for tokens, fetch the
      profile, find/create `User` by email, create a session + cookie.
- [ ] Account linking — **decided: link**. If the Google email matches an
      existing user, attach a new `google` identity to that same user (do not
      create a duplicate user, do not error). If no user exists, create one.
      Caveat: we trust Google's verified email; local accounts are currently
      unverified, so revisit once email verification (Step 5) lands.

## Step 4. Frontend (Angular)

- [ ] Auth HTTP service (`withCredentials: true` for the cookie).
- [ ] Pages: registration, login, "Sign in with Google" button.
- [ ] User state (signal/service), loaded via `GET /auth/me`.
- [ ] Route guard for protected pages.
- [ ] HTTP interceptor: handle `401` (redirect to login).
- [ ] Page/UI with the list of active sessions and a "sign out everywhere" button.

## Step 5. Hardening (production-readiness)

- [x] Rate limiting via `@nestjs/throttler` (global default + stricter limit on
      `/auth/login` and `/auth/register`), config in its own `ThrottlingModule`.
- [ ] CORS config for the frontend (origin + credentials).
- [ ] Cookie hardening: `secure` in prod, consider the `__Host-` prefix.
- [ ] CSRF strategy (sameSite=lax already in place; decide if a token is needed).
- [ ] Password strength check / policy.
- [ ] (Optional) Email verification, password reset.

## Open questions

- argon2 vs bcrypt.
- ~~Behavior on email collision~~ — decided: link the Google identity to the
  existing user by email (see Step 3).
- Whether email verification and password reset are in scope for this project.
