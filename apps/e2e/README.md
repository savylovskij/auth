# e2e

End-to-end tests for the whole system: Angular frontend, NestJS backend, and the
Mailpit inbox the OTP codes are read from. They live outside `frontend` and
`backend` because every scenario spans all three.

## Prerequisites

Postgres and Mailpit must be running:

```sh
pnpm db:up
```

Browsers are installed once per machine:

```sh
pnpm --filter e2e exec playwright install chromium
```

## Running

```sh
pnpm e2e
```

Playwright boots the backend (`:3000`) and the frontend (`:4200`) itself and
reuses them if they are already up. The backend is started with a shortened
throttle window (`AUTH_THROTTLE_TTL_MS=1000`, `AUTH_THROTTLE_LIMIT=50`) so the
suite is not rate limited by its own traffic; production values live in `.env`.

Tests run on a single worker against a shared database, and each one provisions
its own account with a unique email address.
