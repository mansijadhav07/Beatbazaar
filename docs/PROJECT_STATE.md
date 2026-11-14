# Project state

This snapshot records the local verification and repair pass only. A feature is
not treated as complete merely because implementation code exists. External
credentials, legal/accounting decisions, production behavior, and physical
device checks are kept separate from automated evidence.

## Summary

- The project is a Next.js 15 marketplace for beats and licenses.
- The application has real-data public catalog routes, role-specific account
  areas, producer upload and payout screens, admin routes, policy drafts, SEO
  metadata, and Razorpay test-mode payment/payout code.
- The launch setting is INR only. International payments are disabled.
- `payoutsEnabled` defaults to false. The feature flag has a unit test.
- MongoDB is used for the job queue rather than adding a Redis service. This is
  an intentional infrastructure choice, not a feature claim about Redis.
- Policy and license pages remain drafts. Legal, tax, platform fee, refund
  window, and Razorpay Route eligibility decisions remain owner-blocked.
- The seed command is development-only and requires a distinct test-named
  database. It provisions local buyer, producer, and admin accounts plus
  local test catalog records and prints generated passwords once per run.
- `npm run dev` now targets that same validated test database, so local
  authentication uses the seeded account records rather than `MONGODB_URI`.
- Seeded Better Auth credential records store the account `userId` as a BSON
  ObjectId, matching the MongoDB adapter's user reference. Legacy string
  references are normalized when the local account is provisioned.
- Local seed assets are committed under `public/demo/`. They are test fixtures,
  not commercial catalog content.
- There is no admin signup. Use the local-only bootstrap instructions in
  [feature-url-map.md](./feature-url-map.md).

## Repairs made in this verification pass

- Added role-aware account links and a role-specific dashboard entry point.
- Preserved protected paths and query strings in unauthenticated login
  redirects and constrained return paths to safe relative URLs.
- Restricted signup to buyer and producer roles and rejected admin self
  assignment.
- Made browser tests and auth links use the actual Playwright server origin.
- Set Playwright email delivery to `mock`, preventing tests from sending mail
  to a configured external provider.
- Resolved producer usernames for track cards on `/tracks`, so producer names
  link to their public profiles.
- Fixed an external Razorpay terms link to use both `noopener` and
  `noreferrer`.
- Replaced the deprecated/unsupported `next lint` command with zero-warning
  ESLint plus TypeScript checks. Generated Next output is excluded from lint.
- Restricted buyer order history to buyer accounts and corrected wrong-role
  messages to name the required account type.
- Updated the email test to use a mock provider rather than inherited
  credentials.
- Added a role-based link crawl and route URL map, audit, and feature test
  matrix.
- Fixed seeded admin sign-in: the seed wrote `account.userId` as a string while
  the Better Auth MongoDB adapter queried it as an ObjectId. A real login
  returned HTTP 401 before the fix. After normalizing the reference, browser
  sign-in returned HTTP 200 and opened the admin route.
- Added a resend verification action after successful registration and when
  sign-in is blocked for an unverified email. The verification page can also
  request a link and now sends token links through Better Auth instead of
  treating the presence of a token as proof of verification.
- Preserved the application MongoDB URI for Playwright's safety check while
  keeping the app process pointed only at the isolated test database. This
  fixed Playwright's dev-server startup rejection when its test launcher sets
  `MONGODB_URI` to `MONGODB_TEST_URI`.
- Google account linking requires both the existing local account and Google
  to verify the exact same email. Different email addresses and unverified
  Google claims remain blocked. Added a policy test.
- Changed the development webpack cache from filesystem packs to in-memory
  caching after observing Next.js fail on a missing `.pack.gz` cache file.
  Added a regression test for the configured cache mode.
- Confirmed the verification email failure is Resend testing-mode policy:
  the configured sender domain is `resend.dev`, and the provider allows
  sending only to the account owner's address until a domain is verified.
  Provider error bodies are no longer included in server exceptions. The
  resend screen now explains the domain setup needed for delivery.
- Added a database-backed producer-to-refund Playwright journey. It registers
  and verifies a producer, creates a profile, uploads generated audio through
  the wizard, processes it with the real worker processor and in-memory test
  storage, approves it as an admin, finds it through catalog search as a
  buyer, completes a mocked INR checkout and signed webhook, downloads it,
  refunds it as an admin, then verifies the existing app download token is
  revoked. The test removes its database records and temporary audio.
- Added browser coverage for multipart ETags, fake audio rejection, oversized
  audio rejection, and anonymous beat reporting with a contact email. Added
  server upload-URL tests proving oversized and mismatched media types are
  rejected before draft creation or storage URL generation.
- Kept the "Report this beat" flow public, required a contact email, and
  verified rate limiting and that raw IP addresses are not stored.
- Added `npm run smoke:local` for private R2 upload, worker processing, and a
  Razorpay test order that is not captured. The production refusal guard was
  verified. The external smoke was not run: configured R2 bucket names do not
  identify test buckets, so the script will block the R2 and worker checks.
- Updated the outdated admin report test to check the required contact-email
  validation for anonymous reports. Removed two unused imports exposed by the
  zero-warning lint run.

## Test identity and integration evidence

- Test identity implementation is in
  [test-identity.ts](../src/server/auth/test-identity.ts). Its tests cover
  production startup rejection, constant-time secret comparison behavior,
  allowed roles, admin opt-in, failed identity behavior, and absence of Host
  header trust.
- `src/server/auth/test-identity.test.ts`: 17 tests.
- `src/middleware.test.ts`: 11 tests in the current repository.
- `src/server/auth/guards.test.ts`: 11 tests.
- Together these cover 39 test-identity and authorization cases.
- The opt-in MongoDB rate limiter integration test passed in the full Vitest
  run against the isolated test database. It is not skipped in this
  environment.
- Admin API tests are in
  [admin-routes.test.ts](../src/app/api/admin/admin-routes.test.ts). They
  cover foreign-origin rejection, scoped step-up tokens and sensitive-field
  exclusion, missing password credentials, the separate test-admin opt-in,
  moderation and featured-state validation, report decisions, refund reasons,
  export authorization, and unauthenticated public report submission. They do
  not execute every admin state change against persistent data. See the
  [feature test matrix](./feature-test-matrix.md) for coverage limits.
- `src/config/site.test.ts` checks that payouts default to false and require
  explicit enablement.
- `src/server/legal/legal-registry.test.ts` checks the legal marker registry.

## Latest verified commands

Final local verification:

- `npm test`: 50 test files passed, 196 tests passed, zero failed. This includes
  the MongoDB rate limiter integration test against the isolated test database.
- `npm run lint`: zero ESLint warnings/errors and TypeScript check passed.
- `npm run build:test`: production build passed against the isolated test
  database. Build output reported 103 kB shared first-load JavaScript, 116 kB
  for home, 129 kB for `/tracks`, and 143 kB for track detail.
- Targeted E2E matrix for `phase2-journey.spec.ts`,
  `upload-edge-cases.spec.ts`, and `public-report.spec.ts`: 5 passed, 20
  skipped, 0 failed across Desktop Chrome, Desktop Safari, iPhone 14, iPhone
  SE, and iPad Pro 11. All five cases are explicitly limited to Desktop
  Chrome to avoid redundant device runs, duplicate database writes, and
  repeated large sparse-file setup. Thus each test is run once, with four
  device-profile skips per test.
- The full lifecycle test passed in a separate Desktop Chrome run after
  changing the buyer path to discover the new listing via `/tracks` search.
- The production safety check for `npm run smoke:local` refused to run when
  `NODE_ENV=production`; no R2 or Razorpay requests were made.
- Focused auth Playwright matrix: 29 passed, 6 skipped, 0 failed across
  Desktop Chrome, Desktop Safari, iPhone 14, iPhone SE, iPad Pro 11 portrait
  and landscape, and Pixel 7. The database-backed auth journey runs only in
  Desktop Chrome to avoid duplicate writes; the UI resend checks ran in all
  seven profiles.
- OAuth account-linking policy test confirms both local and provider email
  verification are required and different addresses are forbidden.
- Development webpack cache test confirms local dev uses memory caching.
  The auth Playwright run started its Next.js dev server without the missing
  `.pack.gz` cache error.
- The ngrok `ngrok-free.dev` origin pattern was checked against the exact
  reported hostname. Login now returns from an unlinked Google callback to a
  clear verification recovery message instead of Better Auth's generic error
  route.
- Secret scan: `node scripts/scan-secrets.mjs` reported no recognized
  credentials in repository files or Git history.
- Em-dash scan over `src`, `e2e`, `worker`, `scripts`, and `docs`: no matches.
- Five-project Playwright matrix: 156 passed, 24 skipped, 0 failed, 180 total.
  This is the earlier full-matrix run, not a rerun in this repair pass.
  Skips were limited to iPhone 14-specific upload, admin-sheet, and
  support-page checks, plus axe checks scoped to Desktop Chrome and iPhone 14.
  Details are in [link-report.md](./link-report.md).
- The link-audit spec passed across the five selected projects. It checks
  routes, sitemap destinations, redirects, canonical origins and paths,
  external-link relations, role access, and desktop/mobile navigation.
- Role-aware account navigation on Desktop Chrome and iPhone 14: 6 passed.
- `npm run measure:perf:test`: production build, emulated iPhone 14, 4x CPU
  throttling, 150 ms network latency, 1.6 Mbps download, 0.75 Mbps upload.
  The interaction number is a single-interaction Event Timing proxy, not
  field INP.

| Page | LCP | Interaction proxy | CLS |
|---|---:|---:|---:|
| Home | 508 ms | 48 ms | 0 |
| `/tracks` | 340 ms | 16 ms | 0 |
| Track detail | 324 ms | 16 ms | 0 |
| Producer profile | 336 ms | 16 ms | 0 |

These are synthetic local lab measurements. A before baseline was not captured
in this verification, and no production field INP or real-device measurement
is claimed.

The new lifecycle journey uses mocked upload URLs/storage and a mocked
Razorpay checkout/webhook payload, while running the worker audio processor
against in-memory test storage. It proves app-level refund revocation but does
not prove live R2, Razorpay, or a physical-device flow.

All current results and exact final counts must be refreshed after the
remaining checks. See [compliance-audit.md](./compliance-audit.md),
[link-report.md](./link-report.md), and
[feature-test-matrix.md](./feature-test-matrix.md).

## Owner and external-service blockers

- Legal counsel must approve terms, privacy, refund, delivery, producer
  guidelines, copyright/takedown, and license wording.
- A chartered accountant and owner must decide GST, TDS, invoicing, platform
  fees, and the refund window. No values are inferred.
- Razorpay Route eligibility and production account onboarding need owner
  confirmation.
- Real Razorpay webhooks/payments, Cloudflare R2, Google OAuth, and production
  email are not validated by these local tests.
- `npm run smoke:local` needs a separate `MONGODB_TEST_URI` whose database
  name contains `test`, R2 credentials, public and private R2 bucket names
  containing `test`, local `ffmpeg`, and `RAZORPAY_KEY_ID` beginning with
  `rzp_test_` plus `RAZORPAY_KEY_SECRET`. `NEXT_PUBLIC_APP_URL`, if set, must
  use a localhost hostname. The current R2 bucket configuration does not pass
  the test-bucket guard, so live R2/worker smoke checks were not run. The
  Razorpay external test-order call was also not run.
- Google OAuth linking was not exercised against Google's external callback.
  Local credentials are present, but their validity and the configured
  redirect URI still require an owner-side sign-in test.
- No local S3-compatible emulator has been added. Ask before adding an
  emulator or new dependency.
- A before/after performance comparison, production field metrics, and a
  manual physical iPhone run are not available in this local test pass.
- Implement and run the complete producer-to-refund Playwright journey. Real
  R2-backed processing and real provider operations still need credentials or
  approved test doubles.

## Manual verification

Use the [feature URL map](./feature-url-map.md) for route access and seeded
account setup. For actual local test credentials, run `npm run db:seed` against
the isolated test database and use the randomly generated passwords printed
once by that command. Running it again rotates those passwords.

Suggested commands:

```sh
npm run dev
npm run worker
npm run lint
npm test
npm run build:test
npm run measure:perf:test
npm run e2e
npm run smoke:local
node scripts/scan-secrets.mjs
```

The worker requires MongoDB, ffmpeg, and configured storage to process real
uploads. Do not start it against the application database while verifying
local changes.
