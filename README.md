# Beatbazaar

Beatbazaar is an online marketplace where music producers publish beats and artists preview them before choosing a license. Producers set the available license terms, and buyers can purchase and download licensed files.

## Features by role

- **Visitor:** browse and search published beats, use catalog filters, preview available audio, and view producer, genre, language, and location pages.
- **Buyer:** use a cart, complete INR checkout, view orders, download purchased files, and access order license PDFs.
- **Producer:** create a public profile, upload and manage beats, review sales and earnings, and view KYC and payout status.
- **Admin:** review beats, handle reports, manage users and orders, issue refunds, manage featured content and settings, and inspect the audit log. Admin routes check the role on the server and require step-up authentication for changes.

## Technology

- Next.js 15 App Router, React, and TypeScript
- Tailwind CSS
- MongoDB with Mongoose and a MongoDB-backed job queue
- Cloudflare R2 for public previews and private originals and deliveries
- Better Auth
- Razorpay test-mode checkout and Route payout integration
- ffmpeg and ffprobe for audio preview and waveform processing

## Prerequisites

- Node.js supported by the installed Next.js version: `^18.18.0`, `^19.8.0`, or `>=20.0.0`. This repository does not pin a Node version in `package.json` or `.nvmrc`.
- A MongoDB replica set, such as MongoDB Atlas, for transaction-backed flows.
- `ffmpeg` and `ffprobe` installed and available on `PATH` when running the audio worker.
- MongoDB credentials for local app, seed, migration, and test database tasks.
- Cloudflare R2 credentials for actual uploads, worker storage, and private downloads.
- Razorpay test credentials for real test-mode checkout and Route API calls.
- Google OAuth credentials only for Google sign-in. A verified email sender is needed for external email delivery. In local development, email can be written to the console when the provider is unset or mocked.

## Quick start

1. Install dependencies and create a local environment file:

   ```sh
   npm install
   cp .env.example .env.local
   ```

2. Set `MONGODB_URI` and `MONGODB_TEST_URI` in `.env.local` to separate databases. The test database name must contain `test`. `npm run dev`, the seed command, and Playwright use the isolated test database. Do not point local testing at production.

3. Apply migrations to the isolated test database. `migrate-mongo` reads `MONGODB_URI`, so pass the test connection string for this command. Replace the sample connection string with the exact test URI configured in `.env.local`:

   ```sh
   MONGODB_URI='mongodb://localhost:27017/beatbazaar_test' npm run db:migrate
   ```

4. Seed the local test database and save the generated passwords printed in that terminal:

   ```sh
   npm run db:seed
   ```

   Seeding is development-only. It creates local buyer, producer, and admin accounts plus committed local demo beats. Passwords are random, printed once per seed run, and rotated when seeding is repeated.

5. Start the web app. In another terminal, start the worker when testing audio processing with configured storage:

   ```sh
   npm run dev
   npm run worker
   ```

### Creating the first admin

There is no admin signup. For the isolated local test database, create an admin with `ADMIN_EMAIL` and `ADMIN_PASSWORD`:

```sh
ADMIN_EMAIL=admin@example.test ADMIN_PASSWORD='use-a-unique-local-password' npm run db:create-admin
```

The bootstrap command requires the separate test database settings and refuses production. Sign in through `/login` after the command completes. Never commit the password.

## Environment variables

The full variable list and placeholders are in [.env.example](./.env.example). There is no separate `docs/environment.md` in this repository.

| Group | Used for |
|---|---|
| App URL and Better Auth | Local origin, sessions, signup, login, and verification |
| MongoDB | App data, isolated test data, migrations, and the worker queue |
| Google OAuth | Optional Google sign-in |
| Cloudflare R2 | Direct uploads, public previews, private originals, and downloads |
| Razorpay and payout settings | INR checkout, webhook verification, payout mode, and the payout feature flag |
| Email | Verification, password reset, and transactional notifications |
| Admin bootstrap | `ADMIN_EMAIL` and `ADMIN_PASSWORD` for `npm run db:create-admin` |

`PAYOUTS_ENABLED` defaults to `false`. USD and international payments are disabled in code for launch.

## Useful commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start Next.js against the isolated test database |
| `npm run worker` | Start the MongoDB-queue audio worker |
| `npm test` | Run Vitest |
| `npm run lint` | Run ESLint with zero warnings and TypeScript checking |
| `npm run build` | Create the production build |
| `npm run e2e` | Run the configured Playwright suite |
| `npm run db:migrate` | Apply migrations using `MONGODB_URI` |
| `npm run db:seed` | Seed the isolated local test database |
| `npm run smoke:local` | Check local R2, worker, and Razorpay test-mode setup with a production refusal guard |
| `npm run check:contrast` | Check palette contrast and disallowed brass text usage |
| `npm run screenshots:stage1` | Save public-page screenshots at 390, 768, and 1280px; requires a running local app and seeded test data |

## Project structure

```text
src/app/          App Router pages, route handlers, and metadata endpoints
src/components/   Shared UI and marketplace components
src/config/       Site configuration and feature flags
src/lib/          Shared client-safe utilities and validation
src/server/       Authentication, database models, storage, payments, and services
migrations/       Database index and data migrations
worker/           Audio-processing worker and MongoDB job polling
public/           Local assets, including committed demo audio and covers
scripts/          Development, database, test, and verification commands
e2e/              Playwright browser tests
docs/             Project state, compliance, routes, and test evidence
```

## How it works

### Upload and processing

The producer upload flow requests scoped upload URLs and sends files to R2. The server validates uploaded objects before queueing work in MongoDB. The worker uses ffmpeg and ffprobe to generate a watermarked public preview and waveform peaks; original files stay private. A processed beat remains subject to moderation before it is publicly listed.

### Checkout and webhooks

Checkout is INR only. The server creates the payment order, verifies Razorpay webhook signatures, and handles duplicate events idempotently before marking an order paid. Browser redirects alone do not confirm payment.

### Downloads and license PDFs

Private files are delivered through short-lived signed URLs after an ownership check. Buyers can return to their order to download eligible files and its generated license PDF.

### Producer payouts

Payouts are controlled by `PAYOUTS_ENABLED`, which defaults to `false`. When enabled, the configured Route mode uses Razorpay linked accounts and held transfers. There is no withdraw button. The `manual` payout mode is a configuration value only, not an implemented transfer workflow.

### Moderation

Newly processed beats enter moderation. Admin actions are role-protected, use step-up authentication for state changes, and are recorded in the audit log.

## Security notes

- Originals and license files belong in the private R2 bucket. Delivery uses signed URLs and buyer ownership checks.
- Admin routes enforce role checks on the server. Hiding an admin link is not an authorization control.
- Auth, upload, download, search, and public report endpoints use rate limits where implemented.
- Playwright test identities are opt-in and rejected in production. The development app and seed use an isolated test database.
- Keep secrets in `.env.local` or the deployment secret manager. Do not commit environment files or generated seed passwords.

## Status and known limitations

- Launch currency is INR. International payments are disabled.
- Producer payouts are disabled by default.
- Terms, privacy, refund, and license language are placeholders requiring legal review.
- Tax treatment, GST, TDS, platform fee, refund window, and Razorpay Route eligibility require owner and professional decisions. No rates or legal conclusions are assumed here.
- Real R2 and Razorpay checks require valid test credentials and eligible test bucket configuration. Demo assets are local test fixtures, not commercial catalog content.

See the [compliance audit](./docs/compliance-audit.md), [feature URL map](./docs/feature-url-map.md), [feature test matrix](./docs/feature-test-matrix.md), and [project state](./docs/PROJECT_STATE.md) for current evidence and limitations.

## Contributing

Follow [CLAUDE.md](./claude.md), keep changes scoped, avoid em dashes, and add tests for behavior changes. Run the relevant tests and checks before submitting a change.

## License

License: to be decided by the owner
