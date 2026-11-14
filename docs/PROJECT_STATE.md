# Project state

This is the verified implementation snapshot for the Beatbazaar repository.
It distinguishes code that exists from behavior that has not been validated
against external services or real users.

## Current status

- The application builds with Next.js 15 and TypeScript.
- The database seed command connects using the configured Atlas application
  database. Its current behavior validates and reports existing track and
  producer counts; it does not insert demo records.
- Seed connection failure was caused by ES module static imports evaluating
  the Mongoose module before dotenv loaded `.env.local`; the module captured
  its localhost fallback. The seed now loads database modules after dotenv,
  checks for an explicit application database, rejects the test URI, and the
  shared Mongoose connector reads its URI when connecting.
- Authentication, buyer checkout, producer upload and dashboard, admin
  foundation, and Razorpay test-mode payment and payout integrations are
  implemented in the repository.
- Producer payout code covers linked-account onboarding, ledger entries,
  transfer holds, KYC activation, disputes, refunds, and reconciliation
  reporting. Provider operations have not been tested with live credentials.
- SEO and support work currently covers metadata for existing public routes,
  JSON-LD for the site and track pages, canonical and noindex handling,
  robots.txt, a sitemap index with static and live-track sitemaps, generated
  track Open Graph images, the app manifest, and support and policy pages.
- Full-height page and authentication layouts use dynamic viewport sizing for
  mobile Safari rather than a fixed viewport height.
- Policy and license language remains a draft. Pages that require legal
  approval are marked `LEGAL REVIEW REQUIRED`.
- International payments remain disabled. The payout mode configuration is
  a seam for future work, not an implemented manual USD payout process.

## Verification completed

Latest local verification:

- `npm test`: 125 passed, 1 skipped. The skipped case is the opt-in
  MongoDB-backed rate-limit integration test.
- `npm run lint`: passed with no warnings or errors.
- `npm run build`: passed.
- `npm run e2e -- e2e/phase6-admin.spec.ts e2e/phase7-public.spec.ts`:
  9 passed and 12 skipped. The iPhone 14 admin settings and public support
  page checks passed. The other skips are expected project or browser-profile
  skips.
- `npm run e2e -- e2e/phase5-payouts.spec.ts --project="Mobile Safari (iPhone 14)"`:
  1 passed with the provider response mocked.
- `node scripts/scan-secrets.mjs`: no recognized credentials found in
  repository files or Git history.
- `git diff --check`: passed.
- `npm run db:seed`: connected to the configured `beatbazaar` database,
  reported 0 tracks and 0 producer profiles, and exited successfully.

The MongoDB integration test was separately run with `.env.local` loaded
against the isolated `test_database` and passed. The default `npm test`
command still skips it unless the environment is loaded into the test
process. Do not point it at the application's primary database.

Automated browser tests use the test identity mechanism and do not validate
live payments, real producer onboarding, real transfers, or real downloads.
No manual check on a physical iPhone has been completed.

## Remaining work before launch

- Apply migrations only to a database that has been explicitly confirmed as
  the intended environment.
- Confirm with a chartered accountant who supplies each sale, GST and invoice
  treatment, any TDS obligations, payment-fee accounting, and refund and
  settlement records. Do not enable live payments until these decisions are
  approved.
- Obtain legal review of terms, privacy, refund, delivery, and producer
  license language.
- Confirm the business's Razorpay Route eligibility and producer entity
  onboarding requirements with Razorpay. Verify retry, refund, dispute, and
  settlement behavior in an approved test account before any live launch.
- The project has no producer-profile pages, curated genre landing pages,
  location landing pages, or blog routes with real content. These are not
  included in the sitemap. Add them only when the required real data exists.
- The track Open Graph endpoint compiles, but has not been runtime-tested
  against a real track record and configured public image storage.
- Run Core Web Vitals checks on a representative deployed environment, check
  pages on a physical iPhone, and complete the remaining accessibility and
  responsive-device review.
- Set confirmed production domain, support contact, storage, authentication,
  payment, and email configuration before deployment.

Accounting and Route decisions are recorded in
[`payouts-legal-review.md`](./payouts-legal-review.md). R2 bucket CORS
guidance is in [`r2-cors.md`](./r2-cors.md).

## Local commands

```sh
npm run dev
npm run worker
npm test
npm run lint
npm run build
npm run e2e -- e2e/phase6-admin.spec.ts e2e/phase7-public.spec.ts
node scripts/scan-secrets.mjs
```

Database commands operate on the URI configured in the environment. Review
that target before running them:

```sh
npm run db:migrate
npm run db:seed
```

## Environment configuration

Use `.env.example` as the key list and keep real values in an ignored local
environment file or a deployment secret manager. Required values depend on
which integration is being exercised:

- Local app and database: `NEXT_PUBLIC_APP_URL`, `MONGODB_URI`,
  `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`.
- MongoDB integration test only: `MONGODB_TEST_URI`, pointing to a separate
  test database.
- Google sign-in: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- R2 uploads and downloads: `CLOUDFLARE_R2_ACCOUNT_ID`,
  `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`,
  `CLOUDFLARE_R2_PUBLIC_BUCKET_NAME`, `CLOUDFLARE_R2_PRIVATE_BUCKET_NAME`,
  and `NEXT_PUBLIC_R2_PUBLIC_DOMAIN`.
- Razorpay test integration: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and
  `RAZORPAY_WEBHOOK_SECRET`. Use test credentials only for local validation.
- Business configuration: explicitly review `PLATFORM_FEE_PERCENT`,
  `REFUND_WINDOW_DAYS`, and `PAYOUT_MODE`. The example refund window is a
  placeholder, not an approved customer policy.
- Transactional email: `EMAIL_SERVER_API_KEY` and `EMAIL_FROM`.
- Support contact: `NEXT_PUBLIC_SUPPORT_EMAIL`.

Never commit `.env` files, API keys, webhook secrets, or personal KYC data.
