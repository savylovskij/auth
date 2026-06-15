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

## Step 1. Email registration and login

Decisions to confirm before coding:

- Password hashing: **argon2** (OWASP recommendation) or bcrypt.
- Normalize email to lowercase + trim.

Substeps:

- [ ] Migration: add `passwordHash` (nullable, since Google users may have no
      password) to `users`.
- [ ] Update `User` entity (`passwordHash`, `@Exclude` from serialization).
- [ ] Global `ValidationPipe` via `APP_PIPE` (`whitelist: true`) +
      class-validator.
- [ ] DTOs: `RegisterDto`, `LoginDto` (email/password validation).
- [ ] `AuthService`: `register`, `login` (password check, email normalization).
- [ ] Endpoints: `POST /auth/register`, `POST /auth/login` — create a session and
      set the cookie.
- [ ] `POST /auth/logout` (revoke the current session + clear the cookie).
- [ ] `POST /auth/logout-all` (revoke all sessions of the user).

## Step 2. Session management

- [ ] `GET /auth/sessions` — list the user's active sessions
      (userAgent, ip, createdAt, expiresAt, current — yes/no).
- [ ] `DELETE /auth/sessions/:id` — revoke a specific session.

## Step 3. Google OAuth (native)

- [ ] Config (client id/secret, redirect URI) via env + zod.
- [ ] `GET /auth/google` — redirect to Google with `state` (CSRF) + scope.
- [ ] `GET /auth/google/callback` — exchange `code` for tokens, fetch the
      profile, find/create `User` by email, create a session + cookie.
- [ ] Account linking: what to do if the email already exists (merge or error).

## Step 4. Frontend (Angular)

- [ ] Auth HTTP service (`withCredentials: true` for the cookie).
- [ ] Pages: registration, login, "Sign in with Google" button.
- [ ] User state (signal/service), loaded via `GET /auth/me`.
- [ ] Route guard for protected pages.
- [ ] HTTP interceptor: handle `401` (redirect to login).
- [ ] Page/UI with the list of active sessions and a "sign out everywhere" button.

## Step 5. Hardening (production-readiness)

- [ ] Rate limiting on `/auth/login` and `/auth/register` (`@nestjs/throttler`
      or custom).
- [ ] CORS config for the frontend (origin + credentials).
- [ ] Cookie hardening: `secure` in prod, consider the `__Host-` prefix.
- [ ] CSRF strategy (sameSite=lax already in place; decide if a token is needed).
- [ ] Password strength check / policy.
- [ ] (Optional) Email verification, password reset.

## Open questions

- argon2 vs bcrypt.
- Behavior on email collision (local account + Google with the same email).
- Whether email verification and password reset are in scope for this project.
