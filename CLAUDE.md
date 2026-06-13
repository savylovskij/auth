# CLAUDE.md

## Purpose

This is primarily a learning and experimentation project, but built with
production in mind. Optimize for clarity and learning, while following practices
and structure that could realistically scale to a production-grade application.

## Workflow Rules

- **Work in small steps.** Never implement multiple stages at once. Do one small
  step, then stop.
- **Wait for review after every step.** After each step the user will inspect the
  result, ask questions, request changes, and only then approve moving on. Do not
  proceed to the next step until the user explicitly approves.
- Prefer the smallest possible change that demonstrates the next piece.

## Code Style

- **No comments.** Do not add code comments anywhere unless the user explicitly
  asks for them.

## Tooling

- **Package manager: pnpm.** Always use `pnpm` (never `npm` or `yarn`).
- **Linting/formatting:** ESLint, Prettier.
- **Git hooks:** Husky.

## Architecture

- **Monorepo** containing:
  - **Backend:** NestJS
  - **Frontend:** Angular
- **Database:** PostgreSQL, running in Docker.

## Setup Order

Setup is the first phase, also done in small steps:

1. Initialize the monorepo with pnpm.
2. Set up the NestJS backend.
3. Set up the Angular frontend.
4. Configure ESLint and Prettier.
5. Configure Husky.
6. Set up PostgreSQL in Docker.

Each of these is its own step — finish one, wait for review, then continue.
