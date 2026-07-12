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
      Since Step 6, the linked/created user is also marked `emailVerifiedAt` in the
      same transaction (Google's `email_verified` is required), which resolves the
      earlier caveat about local accounts staying unverified.
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
- [x] Email verification — see Step 6. Password reset — see Step 7.

## Step 6. Email verification (planned)

Goal: prove a registered email is real **and** owned by the user. A syntactic check
or MX-record lookup is not enough (`1@gmail.com` passes MX because `gmail.com` accepts
mail; mailbox existence is not exposed by providers). The only reliable method is a
**confirmation link** — email a single-use tokenized link the user must open. That
proves mailbox ownership, not just existence (industry standard).

Notes:

- **Google is already verified** — Google returns `emailVerified`; those accounts skip
  the flow and are marked verified immediately on link. This also resolves the Step 3
  caveat (local accounts currently unverified). **Done:** `GoogleService.loginWithGoogle`
  sets `emailVerifiedAt` in the same tx when the user isn't already verified.
- Verification tokens mirror sessions: store only a **hash** of the token, single-use,
  with an expiry.

Open decisions (settle when the step is reached):

- **Login gating** — **decided: hard, enforced on the frontend.** An unverified user
  authenticates (gets a session) but is redirected to the verification screen and
  cannot reach app routes until verified (`emailVerifiedAt === null`, read via `me`).
  The **backend has no email guard**: every authenticated route is orthogonal to email
  verification — the verification flow itself (`verify-email`, `resend`), reading own
  state (`me`), leaving (`logout`, `logout-all`), and session management
  (`auth/sessions`, i.e. list + revoke — an account-security tool, not a resource
  "behind the wall"). `SessionGuard` stays authentication-only. If an email-_dependent_
  route is ever added (e.g. password reset), that is the natural place for a backend
  verification gate.
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
- [x] Resend endpoint: throttled `POST /auth/verify-email/resend` (guarded,
      `@CurrentUser`) → `AuthService.resendVerification`: 409 if already verified,
      else reissue via `sendVerificationCode` (new code replaces the prior). Verified
      e2e: 204 + new code, old code→400, new→200, resend-after-verified→409.
- [x] Gating (hard) — backend decision: **no email guard**. Every authenticated route
      (verification flow, `me`, `logout`/`logout-all`, `auth/sessions`) is orthogonal to
      email verification, so all stay `SessionGuard`-only; `SessionGuard` is
      authentication-only. There is no backend resource that email verification should
      protect. Hard gating itself is enforced on the frontend — see the Frontend substep
      below.
- [x] Frontend (hard wall): `me` exposes `emailVerified` (bool derived from
      `emailVerifiedAt`) → domain `User` → `AuthStore`. `verifiedGuard` stacked after
      `authGuard` on `/profile` and `/sessions` redirects unverified users to
      `/verify-email` (`RedirectCommand` + `replaceUrl`). `/verify-email` screen (under
      `authGuard`): 6-digit OTP form (`pattern(/^\d{6}$/)`) → `store.verifyEmail` (updates
      state with the now-verified user, then navigates to `/profile`); a resend action →
      `store.resendVerification`; distinct messages for invalid/expired code (400) and
      throttling (429). No separate post-login redirect is needed — login/register go to
      `/profile` and the guard reroutes unverified users automatically.
- [x] Reap expired verification tokens: `EmailVerificationsService.deleteExpired()` +
      `ExpiredEmailVerificationsCleaner` (`@Cron` daily at midnight), mirroring
      `ExpiredSessionsCleaner`. The password-reset table is reaped the same way (Step 7).

## Step 7. Password reset (done)

Goal: let a user who forgot their password prove mailbox ownership and set a new one.
Decision: **6-digit OTP** (not a magic link), mirroring email verification — same OTP
machinery, TTL, and attempt-capping, so the two flows stay symmetric.

Notes:

- The reset table stores only the **OTP** (its hash), not passwords. The password itself
  stays in `identities.passwordHash`; on success we overwrite it there. Only email
  identities have a password, so Google-only accounts have nothing to reset.
- Anti-enumeration: `forgot-password` always returns 204 regardless of whether the email
  exists; `reset-password` maps a missing identity to the same generic invalid-code 400.

Substeps:

- [x] Data model: `password_resets` table (`id`, `userId` FK, `codeHash`, `expiresAt`,
      `attempts`, `createdAt`) — mirror of `email_verifications`. Entity + migration
      (`AddPasswordResets`).
- [x] Token service (`PasswordResetsService`): `createCode(userId)` → 6-digit OTP,
      argon2-hashed, 10-min TTL, one active per user (deletes prior);
      `verify(userId, code)` → `success | invalid | expired | locked`, single-use,
      caps `attempts` at 5.
- [x] `AuthService.forgotPassword(email)`: looks up the email identity; silently returns
      if none (Google-only / unknown email); else `createCode` + sends the OTP via
      `MailPort`. `AuthService.resetPassword(email, code, newPassword)`: verifies the OTP
      (distinct 400 messages for invalid/expired/locked), then updates
      `identities.passwordHash` **and revokes all of the user's sessions**
      (`SessionsService.revokeByUserId`) — a password change must invalidate every session.
- [x] Endpoints: throttled `POST /auth/forgot-password` and `POST /auth/reset-password`
      (both public, both 204). DTOs: `ForgotPasswordDto` (email), `ResetPasswordDto`
      (email, `code` `/^\d{6}$/`, `newPassword` 8–64). Verified e2e against Mailpit:
      register→forgot (email with code)→reset→old password 401, new password 200, reused
      code 400, forgot for unknown email 204, wrong code 400.
- [x] Frontend: `AuthRepository.forgotPassword`/`resetPassword` → `AuthHttpRepository` →
      use-cases → `AuthStore` (no auth-state change — the user is logged out).
      `/forgot-password` screen (email → sends code, navigates to `/reset-password?email=…`);
      `/reset-password` screen (email prefilled from the query param, `code`, `newPassword`
      → `store.resetPassword`, navigates to `/login`); both under `guestGuard`; a
      "Forgot your password?" link on the login screen. Distinct messages for invalid/expired
      code (400) and throttling (429).
- [x] Reap expired reset tokens: `PasswordResetsService.deleteExpired()` +
      `ExpiredPasswordResetsCleaner` (`@Cron` daily at midnight), mirroring
      `ExpiredSessionsCleaner`.

## Step 8. Defer account creation until email is verified (in progress)

Goal: close a **pre-account takeover** vulnerability (plus email-squatting) rooted in
the current flow, where `register` creates a full `users` + `identities` (password)
row on an **unverified** email and issues a session immediately.

Threat this closes:

- **Pre-account takeover via Google.** Attacker registers `victim@gmail.com` with their
  own password (email stays unverified — they don't own the inbox). Later the victim
  "Sign in with Google": `GoogleService.loginWithGoogle` does `findByEmail` → finds the
  attacker's account, links Google, marks it verified. The account is now shared — the
  attacker keeps persistent access via their password (`logout-all` doesn't help; they
  know the password).
- **Email-squatting.** Registering an email reserves it in `users` (unique), so an
  attacker can block a victim's normal registration and trigger verification spam to a
  foreign address.

Root cause: an unverified email is treated as an owned identity (account + password
exist, and are trusted, before ownership is ever proven).

Fix — **staging table `pending_registrations`** (verify-before-account):

- `register(email, password)` writes **only** a pending row (`email` unique,
  `passwordHash`, `codeHash` OTP, `expiresAt`, `attempts`, `createdAt`) — **no** `users`,
  **no** `identities`, **no** session — and emails the OTP.
- `verify-email(email, code)` in one tx: creates the real `users` + `identities(EMAIL)`,
  sets `emailVerifiedAt`, deletes the pending row, **and now** issues the session.
- Effect: `users` only ever holds emails whose ownership was **proven** (our OTP or
  Google). `GoogleService.findByEmail` can never return an untrusted password account →
  takeover gone. Pending rows reserve nothing → squatting gone. The attacker's pending
  never becomes real because the OTP goes to the **victim's** inbox.

Decisions:

- **`email_verifications` is dropped, not kept.** The OTP now lives on the pending row
  (`pending_registrations.codeHash`), keyed by `email` — there is no `userId` yet, so the
  `userId`-FK `email_verifications` table cannot hold it. This new flow **subsumes** the
  old registration-verification role of `email_verifications`, so the table + entity +
  service + cleaner + module are removed (and the table dropped via migration). If an
  email-_change_ flow (re-verify a new address on an existing account) is ever needed,
  it gets its own `userId`-keyed mechanism then.
- **Trade-off (accepted): registration no longer logs the user in.** Flow shifts from
  "session on register + soft gate" to verify-before-access — register → enter OTP → then
  session. Coherent with the whole point of the project (OTP verification), but it is a
  conscious reversal of the earlier "session on register" behavior.
- **Ordering:** `email_verifications` is live (wired through `AuthService`,
  `AuthController`, `AuthModule` + the frontend), so it is removed **last** — only after
  register/verify are rewritten onto `pending_registrations`, to never break the build.

Substeps:

- [x] Data model: `PendingRegistration` entity + migration (`AddPendingRegistrations`) —
      `email` unique, `passwordHash`, `codeHash`, `expiresAt`, `attempts`, `createdAt`. No
      `userId`/FK (no account exists yet). Migration applied.
- [ ] `PendingRegistrationsService`: `createPending(email, password)` (argon2-hash both the
      password and a 6-digit OTP, 10-min TTL, one active per email — deletes prior);
      `verify(email, code)` → `success | invalid | expired | locked`, single-use, caps
      `attempts` at 5. Module with `forFeature([PendingRegistration])`.
- [ ] `AuthService.register`: write a pending row + send OTP instead of creating the
      account/session. Existing **verified** email → 409 (as today); existing pending → replace.
- [ ] `AuthService.verifyEmail(email, code)`: on success create `users` + `identities` in a
      tx (handle the unique-email race → "already registered, please log in"), delete the
      pending row, issue the session. `verify-email` and `verify-email/resend` become public
      `{ email, code }` / `{ email }` endpoints — **no** `SessionGuard`/`@CurrentUser`.
- [ ] Frontend: `register` no longer sets `AUTHENTICATED`; navigates to `/verify-email?email=…`
      (like the reset flow). `/verify-email` screen collects email (prefilled) + code, calls
      `store.verifyEmail`, on success sets `AUTHENTICATED` → `/profile`. Move `/verify-email`
      route under `guestGuard` (drop `authGuard + unverifiedGuard`); the guard-race (Step 9)
      for this route dissolves as a side effect.
- [ ] Reap expired pending rows: `deleteExpired()` + a `@Cron` cleaner, mirroring the other
      token cleaners.
- [ ] Remove `email_verifications` entirely (entity, service, cleaner, module, result
      type/const) once nothing references it; drop the table via a migration. Update
      `AuthModule` wiring and any specs.

## Step 9. Fix the frontend guard race (planned)

`unverifiedGuard`/`verifiedGuard` read `store.user()` synchronously while `authGuard` is
still loading `me()` — the `canActivate` array runs guards concurrently, not in sequence.
On a full reload / direct URL, the verification guard sees `null` and mis-routes (a verified
user stays on `/verify-email`; `/profile` bounces to `/verify-email`). Fix: the verification
guards must await the resolved auth state (e.g. an `AuthStore.ensureLoaded()` that returns the
current state or loads `me()` first), instead of reading a possibly-`UNKNOWN` signal. Step 8
removes the `/verify-email` case; this step covers the remaining `/profile` + `/sessions` case.

## Open questions

- argon2 vs bcrypt.
- ~~Behavior on email collision~~ — decided: link the Google identity to the
  existing user by email (see Step 3), refined by Step 8 (only verified emails ever exist
  in `users`, so Google linking can no longer hit an untrusted unverified account).
- ~~Whether email verification and password reset are in scope for this project.~~ —
  decided: both in scope and implemented (see Steps 6 and 7).
- ~~Keep `email_verifications` after Step 8?~~ — decided: **drop it**; the pending-registration
  flow subsumes its only role (see Step 8).
