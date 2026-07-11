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

## Step 3. Google OAuth (native) — done

- [x] Config (client id/secret, redirect URI) via env + zod, wired through
      `GoogleModule` (`forFeature` → fail-fast validation at boot).
- [x] `GET /auth/google` — redirect to Google with `state` (CSRF, httpOnly
      cookie) + scope `openid email profile`.
- [x] `GET /auth/google/callback` — verify `state`, exchange `code` for tokens,
      fetch the profile, find/create `User`, create a session + cookie, redirect.
- [x] Account linking — **link**. `GoogleService.loginWithGoogle`: if a `google`
      identity for the `sub` exists → its user; else (verified email required)
      find user by email or create one, then attach a new `google` identity.
      Caveat: we trust Google's verified email; local accounts are currently
      unverified, so revisit once email verification (Step 5) lands.
- Note: callback currently redirects to `/auth/me` as a temporary target;
  becomes the frontend URL in Step 4.

## Step 4. Frontend (Angular)

- [x] Auth HTTP service (`withCredentials: true` for the cookie).
- [x] Pages: registration, login, "Sign in with Google" button.
- [x] User state (signal/service), loaded via `GET /auth/me`.
- [x] Route guard for protected pages.
- [x] HTTP interceptor: handle `401` (redirect to login).
- [x] Page/UI with the list of active sessions and a "sign out everywhere" button.

## Step 5. Hardening (production-readiness)

- [x] Rate limiting via `@nestjs/throttler` (global default + stricter limit on
      `/auth/login` and `/auth/register`), config in its own `ThrottlingModule`.
- [x] CORS config for the frontend (origin + credentials) — `enableCors` in
      `main.ts`, origin from `FRONTEND_URL` (reused `appConfig`), credentials on.
- [x] Cookie hardening: `secure` in prod + `sameSite=lax` (`cookie-options.ts`).
- [x] Cookie `__Host-` prefix — `__Host-session` in prod (`sessionCookieName`),
      plain `session` in dev (no HTTPS on localhost).
- [x] CSRF: decided **no explicit token**. `sameSite=lax` + all mutations on
      POST/DELETE (no state-changing GETs) close the vector; cookie is `httpOnly` + `Secure`/`__Host-` in prod; Google OAuth has its own `state`. No
      `sameSite=none` need, so a synchronizer/double-submit token is redundant
      for this scope.
- [ ] Email verification — see Step 6. Password reset — not started.

## Step 6. Email verification (planned)

Goal: prove a registered email is real **and** owned by the user. A syntactic check
or MX-record lookup is not enough (`1@gmail.com` passes MX because `gmail.com` accepts
mail; mailbox existence is not exposed by providers). The only reliable method is a
**confirmation link** — email a single-use tokenized link the user must open. That
proves mailbox ownership, not just existence (industry standard).

Notes:

- **Google is already verified** — Google returns `emailVerified`; those accounts skip
  the flow and are marked verified immediately on link. This also resolves the Step 3
  caveat (local accounts currently unverified).
- Verification tokens mirror sessions: store only a **hash** of the token, single-use,
  with an expiry.

Open decisions (settle when the step is reached):

- **Login gating** — hard block (unverified users can't pass `SessionGuard` / can't log
  in until confirmed) vs. soft (can log in, but the app shows an "unverified" state and
  restricts sensitive actions). Recommendation: start soft, tighten later.
- **Dev mail transport** — Mailpit/MailHog in Docker capturing SMTP locally vs. a real
  provider. Recommendation: Mailpit in `docker-compose`, behind an abstract mail port so
  the provider can be swapped without touching callers.

Substeps:

- Decision: verification via **6-digit OTP** (not a magic link). Rationale: web +
  soft gating (user is logged in but unverified after register), so a code
  form is natural. Guards against brute-force of the short code: 10-min TTL,
  max 5 attempts then burn, lookup scoped to `currentUser` (no cross-user
  enumeration), plus the global throttler.
- [x] Data model: `users.emailVerifiedAt` (nullable `timestamptz`) + an
      `email_verifications` table (`id`, `userId` FK, `codeHash`, `expiresAt`,
      `attempts`, `createdAt`). Entities + migration (`AddEmailVerification`).
- [x] Token service (`EmailVerificationsService`): `createCode(userId)` → 6-digit OTP,
      argon2-hashed, 10-min TTL, one active per user (deletes prior);
      `verify(userId, code)` → `success | invalid | expired | locked`, single-use
      (consumes on success), increments/caps `attempts` at 5.
- [x] Mail transport: abstract `MailPort` + `SmtpMailService` (nodemailer) sending
      SMTP to Mailpit; `MailModule` binds `MailPort` → `SmtpMailService` and exports
      it; Mailpit in `docker-compose` (SMTP 1025, UI 8025); config via
      `mail.config.ts` (`MAIL_HOST`/`MAIL_PORT`/`MAIL_FROM`).
- [x] Register hook: on email registration the user is created unverified
      (`emailVerifiedAt` null by default); after the tx commits, `AuthService`
      calls `createCode` and sends the OTP via `MailPort`. Verified e2e against
      Mailpit (201 + email with 6-digit code + row hashed, attempts 0).
- [x] Verify endpoint: `POST /auth/verify-email` (guarded, `@CurrentUser`, throttled)
      → `AuthService.verifyEmail` maps the OTP result: success sets `emailVerifiedAt`
      (`UsersService.markEmailVerified`) and consumes the code; already-verified → 409;
      invalid/expired/locked → distinct 400 messages. Verified e2e: wrong→400,
      correct→200, repeat→409, `emailVerifiedAt` set, row consumed. Note: within a
      60s window the `AUTH_THROTTLE` (5/min) shadows the 5-attempt lock — the LOCKED
      path is reachable only across throttle windows (both defenses are complementary).
- [ ] Resend endpoint: throttled `POST /auth/verify-email/resend` for an unverified user.
- [ ] Gating: implement the chosen login-gating decision (hard vs soft).
- [ ] Frontend: "check your email" screen after register; a `/verify-email` landing page
      that calls the endpoint and shows the result; a resend action; reflect the
      unverified state in `AuthStore` if gating is soft.
- [ ] (Optional) Reap expired verification tokens, reusing the expired-session cron.

## Open questions

- argon2 vs bcrypt.
- ~~Behavior on email collision~~ — decided: link the Google identity to the
  existing user by email (see Step 3).
- Whether email verification and password reset are in scope for this project.
