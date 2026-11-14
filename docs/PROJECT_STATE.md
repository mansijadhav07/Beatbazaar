# Project state

This is the verified implementation snapshot for the Beatbazaar repository.
It distinguishes automated local checks from behavior that still requires
provider approval, legal or accounting decisions, a deployed environment, or
a physical device.

## Current status

- The application builds with Next.js 15 and TypeScript.
- The database seed command connects using the configured application
  database. It reports existing track and producer counts and does not insert
  demo records.
- Authentication, buyer checkout, producer upload and dashboard, admin
  foundation, and Razorpay test-mode payment and payout integrations are
  implemented.
- Payout code covers linked-account onboarding, ledger entries, transfer
  holds, KYC activation, disputes, refunds, and reconciliation reporting.
  Provider operations have not been tested with live credentials.
- International payments remain disabled. The payout mode configuration is a
  seam for possible later USD payouts, not an implemented manual USD process.
- Phase 7 public pages include producer profiles, data-backed genre,
  language, and location landings, legal-review policy drafts, data-dependent
  home sections, sitemaps, canonical and noindex rules, structured data,
  generated track Open Graph images, and cache revalidation.
- Pages below a configured landing-page content threshold return successfully
  with `noindex` and are excluded from the relevant sitemap. Content and
  currency do not vary by visitor IP.
- Legal and license language remains draft content. The draft pages show a
  legal-review notice outside production and are tracked in the legal marker
  registry.
- The seed and test fixtures used for verification are not product content.
  There is no claim of real catalog data where the database is empty.

## Step 0g verification

- Test identity is centralized in
  [`test-identity.ts`](../src/server/auth/test-identity.ts). Production
  startup refuses the test identity mode. Secret comparison is constant-time,
  Host headers are not used as a security control, failed identity attempts
  return 404, and admin identity requires a separate explicit opt-in.
- Test coverage: 17 test-identity helper cases, 7 middleware cases, and 9
  authorization guard cases, 33 total.
- The MongoDB-backed rate limiter integration test passed separately against
  the isolated `test_database`: 1 passed. The normal Vitest run leaves this
  opt-in integration test skipped unless its database URI is configured.
- Admin route tests cover origin validation, step-up credentials and
  sensitive-field exclusion, test-mode step-up opt-in, moderation and
  featured-track validation, report and refund validation, export
  authorization, and sign-in requirements for reports.
- Payouts are disabled by default. A config test verifies the default is
  false and explicit enablement works.
- The legal registry test fails when `LEGAL REVIEW REQUIRED` appears outside
  the registry and checks the registered markers.
- `node scripts/scan-secrets.mjs` found no recognized credentials in tracked
  repository files or Git history.

## Phase 7 implementation

- Producer profile pages are server rendered and show the available profile
  details and live beats. Empty profiles are noindex and are excluded from
  the producer sitemap. Producer links are used where producer names appear
  in the catalog, track page, and player.
- Producer usernames colliding with reserved routes are rejected. City
  landing slugs that collide with state slugs receive a disambiguating
  `-city` suffix.
- Genre, language, state, and city landing pages derive their content from
  real database records. Indexable pages include data-derived counts, common
  genres and languages, top beats, `ItemList`, and breadcrumbs.
- Home sections for trending, newest, admin-featured tracks, and genres are
  hidden when their real data is empty. Empty and populated states are
  covered by tests.
- License overview, producer guidelines, and copyright and takedown pages
  were added. The takedown page links to the report form. These are drafts,
  not final legal advice.
- Metadata and structured data coverage includes `Organization`,
  `WebSite` with `SearchAction`, `MusicRecording`, `Product` with `Offer`,
  `BreadcrumbList`, `ProfilePage`, `ItemList`, and `FAQPage` only on a page
  that visibly contains the FAQ.
- Revalidation is wired for beat approval, rejection, removal, exclusive
  sale, and producer profile changes. Tests cover the revalidation triggers.
- Track Open Graph generation returns a PNG with the expected dimensions and
  caching headers when storage is mocked, and has a missing-cover fallback.
- Waveform code is lazy loaded and only renders waveform data that exists.
  Leading catalog and profile images have explicit sizing and priority where
  appropriate.
- The Playwright server uses a separate `.next-playwright` build directory to
  avoid sharing Next.js development output. Generated `.next-perf` output is
  ignored and is not source content.

## Verification completed

Latest verification for this snapshot:

- `npm run build` with `NODE_ENV=production` and the isolated test database:
  passed. The build reported 103 kB shared first-load JavaScript, 116 kB for
  home and producer pages, 129 kB for `/tracks`, and 143 kB for a track page.
- `npm run e2e -- --project="Desktop Chrome" --project="Desktop Safari" --project="Mobile Safari (iPhone 14)" --project="Mobile Safari (iPhone SE)" --project="Tablet Safari (iPad Pro 11)" --workers=1`:
  91 passed, 24 skipped, 0 failed, 115 total. Skips are intentional project
  scope: accessibility checks target Desktop Chrome and iPhone 14; the admin
  and public-support device checks and the upload flow target iPhone 14.
- Focused axe checks passed on Desktop Chrome and iPhone 14 for home,
  `/tracks`, track detail, producer profile, cart, checkout, login, producer
  dashboard, and admin settings. Keyboard focus, reduced-motion behavior,
  labels, and player and waveform control names were also checked. No
  physical iPhone test has been completed.
- Latest complete Vitest run before the final build: 153 passed, 1 skipped.
  The skipped test is the opt-in MongoDB rate-limiter integration test. It
  passed separately against `test_database`.
- `npm run lint` passed with no ESLint warnings or errors and TypeScript
  passed. Next.js reports that `next lint` is deprecated.
- Empty-catalog production output returned 200 and omitted featured,
  trending, newest, and genre sections. Populated home section behavior was
  verified in E2E with test-only fixtures.
- `git diff --check` passed after the final documentation and config updates.

### Mobile-throttled lab measurements

The same production mobile emulation profile was used before and after the
image-loading and waveform work: Chromium emulating iPhone 14, 4x CPU
throttling, 150 ms latency, 1.6 Mbps download, and 0.75 Mbps upload.
Interaction latency is a lab estimate, not field INP. These are synthetic
measurements, not production Core Web Vitals.

| Page | LCP before | LCP after | Interaction latency before | Interaction latency after | CLS before | CLS after |
|---|---:|---:|---:|---:|---:|---:|
| Home | 648 ms | 636 ms | 56 ms | 56 ms | 0 | 0 |
| `/tracks` | 924 ms | 780 ms | 40 ms | 40 ms | 0 | 0 |
| Track page | 548 ms | 528 ms | 40 ms | 40 ms | 0 | 0 |
| Producer page | 544 ms | 524 ms | 40 ms | 40 ms | 0 | 0 |

These runs used temporary records in the isolated test database. The records
were removed after measurement. No real catalog cover art was available for
the fixture, so the results do not validate production image delivery.

## Manual checks still required

On a physical iPhone, verify:

- Header and bottom player respect safe areas in portrait and landscape.
- Search, filters, play, pause, seek, volume, queue, and buy actions work by
  touch and do not start audio before a user gesture.
- The keyboard does not cover focused fields or fixed bottom controls during
  login, profile editing, report submission, cart, and checkout.
- Reduced-motion settings keep content visible, and VoiceOver announces
  links, form labels, player controls, and waveform seeking meaningfully.
- The producer dashboard, sales export, and payout status remain readable at
  phone widths.

## Remaining work before launch

- Complete the physical iPhone checks above and validate Core Web Vitals on a
  representative deployed environment.
- Obtain legal review of terms, privacy, refund, delivery, producer
  guidelines, copyright and takedown, and license language.
- Ask a chartered accountant to decide who supplies each sale, GST and
  invoice treatment, any TDS obligations, payment-fee accounting, and refund
  and settlement records. No rates or tax treatment are assumed here.
- Confirm Razorpay Route eligibility and producer entity onboarding
  requirements. Exercise onboarding, captured-payment transfer holds,
  release, refund, dispute, reversal, and settlement reconciliation in an
  approved provider test account before any live launch.
- Confirm production domain, support contact, storage, authentication,
  payment, and email configuration. Keep international payments disabled
  until separately approved and implemented.
- Apply migrations only to a database explicitly confirmed as the intended
  environment. Do not direct local tests or seed operations at the primary
  database unintentionally.
- The seed command does not create demo data. The current catalog remains
  whatever real approved records exist in the configured database.

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
npm run e2e
node scripts/scan-secrets.mjs
```

Run the five-project browser matrix with:

```sh
npm run e2e -- --project="Desktop Chrome" --project="Desktop Safari" --project="Mobile Safari (iPhone 14)" --project="Mobile Safari (iPhone SE)" --project="Tablet Safari (iPad Pro 11)" --workers=1
```

Database commands operate on the URI configured in the environment. Review
the target before running them:

```sh
npm run db:migrate
npm run db:seed
```

## Environment configuration

Use `.env.example` as the key list. Keep real values in an ignored local
environment file or a deployment secret manager. Required values depend on
which integration is exercised:

- Local app and database: `NEXT_PUBLIC_APP_URL`, `MONGODB_URI`,
  `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`.
- MongoDB integration test only: `MONGODB_TEST_URI`, pointing to the
  separate test database.
- Google sign-in: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- R2 uploads and downloads: `CLOUDFLARE_R2_ACCOUNT_ID`,
  `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`,
  `CLOUDFLARE_R2_PUBLIC_BUCKET_NAME`, `CLOUDFLARE_R2_PRIVATE_BUCKET_NAME`,
  and `NEXT_PUBLIC_R2_PUBLIC_DOMAIN`.
- Razorpay test integration: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and
  `RAZORPAY_WEBHOOK_SECRET`. Use test credentials for local validation.
- Business configuration: explicitly review `PLATFORM_FEE_PERCENT`,
  `REFUND_WINDOW_DAYS`, and `PAYOUT_MODE`. The example refund window is a
  placeholder, not an approved customer policy.
- Transactional email: `EMAIL_SERVER_API_KEY` and `EMAIL_FROM`.
- Support contact: `NEXT_PUBLIC_SUPPORT_EMAIL`.

Never commit `.env` files, API keys, webhook secrets, or personal KYC data.
