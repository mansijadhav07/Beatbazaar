# Feature test matrix

This matrix distinguishes tests that exist from tests actually run in the current
verification. Vitest and Playwright names are cited so a result can be reproduced.

| Feature | Unit/integration evidence | Browser evidence | Status in this pass |
|---|---|---|---|
| Signup role validation, admin rejected | `src/server/auth/admin-rejection.test.ts`; `src/server/auth/auth-integration.test.ts` | `e2e/auth-verification.spec.ts` | Unit and role checks passed |
| Login, session, verification, reset, Google account linking | `src/server/email/email-flow.test.ts`; `src/server/auth/auth-integration.test.ts`; `src/server/auth/account-linking.test.ts` | `e2e/auth-verification.spec.ts` covers signup, resend, unverified rejection, verification, and verified sign-in; Google OAuth callback requires external credentials | Local auth journey and link policy passed; Google callback and password-reset delivery remain provider-config dependent |
| Role protection and safe redirects | `src/server/auth/guards.test.ts`; `src/middleware.test.ts`; `src/lib/safe-return-path.test.ts` | `e2e/link-audit.spec.ts` guest redirect and account-menu role cases | Passed |
| Producer profile and public page | `src/app/producer/[username]/page.test.tsx`; catalog tests | Account menu and link crawl | Partial, no full profile-setup journey |
| Upload validation, file sniffing and size limits | `src/server/storage/sniffer.test.ts`; validation tests | `e2e/upload.spec.ts` | Unit passed; Playwright matrix run pending |
| Multipart upload | No complete end-to-end multipart test identified | Upload spec covers mocked single MP3 only | Missing |
| Worker audio preview and waveform | `src/server/audio/transcoder.test.ts`; `src/server/jobs/queue.test.ts` | No actual R2-backed worker journey | Partial; R2 credentials required |
| Moderation approval/rejection and emails | `src/server/catalog/revalidation.test.ts`; admin route tests | No full producer-to-admin email journey | Partial |
| Browse, search, filters, sort, pagination | `src/server/catalog/repository.test.ts`; public catalog tests | `e2e/browse-and-player.spec.ts`; link crawl routes | Partial; full matrix pending |
| Track statuses, producer links, SEO | SEO and catalog tests | Link crawl checks routes and links | Partial |
| Persistent player and play counting | Track/play service tests | `e2e/browse-and-player.spec.ts`; `e2e/phase4-checkout.spec.ts` | Partial |
| Cart and free license flow | Payment tests | `e2e/phase4-checkout.spec.ts` empty cart/checkout UI | Partial |
| Paid checkout with mocked provider | `src/server/payments/payments.test.ts` | Phase 4 checkout spec asserts server order request and INR total | Partial |
| Price tampering, exclusive race, webhook signature/idempotency | `src/server/payments/payments.test.ts` | Not a complete buyer journey | Unit coverage passed |
| Download ownership, license PDF, order history, refunds | Payment/order tests | No complete download-and-refund browser journey | Partial |
| Earnings ledger and payouts off/on | `src/server/payouts/payouts.test.ts`; payout onboarding route test | `e2e/phase5-payouts.spec.ts` mocked provider | Partial; matrix pending |
| Reconciliation mismatch | Payout tests, if listed by implementation | No external reconciliation run | Partial |
| Admin sections, step-up, audit log | `src/app/api/admin/admin-routes.test.ts`; `src/server/admin/step-up.test.ts` | `e2e/phase6-admin.spec.ts` settings/navigation | Partial |
| Public report and takedown | Report API and legal registry tests | No full report submission browser case | Partial |
| Featured content | Admin route tests | Admin UI not fully crawled for action behavior | Partial |
| Sitemap, robots, canonicals, JSON-LD | `src/app/seo-baseline.test.ts`; `src/app/seo-routes.test.ts`; sitemap and structured-data tests | `e2e/phase7-public.spec.ts`; link crawl | Partial |
| Policy pages and legal text guard | `src/server/legal/legal-registry.test.ts` | Phase 7 public pages | Partial |
| Rate limiting | `src/server/auth/rate-limit.test.ts`; isolated Mongo integration test | Not exercised against production | Passed locally |
| Security headers | No end-to-end header matrix identified | Not asserted in link crawl | Missing |
| Axe accessibility | Existing `e2e/accessibility.spec.ts` | Home, tracks, track, producer, cart, checkout, login, dashboard, admin settings on Desktop Chrome and iPhone 14 | Tests exist; full matrix pending |
| Responsive overflow | Existing `e2e/responsive.spec.ts` | Selected test pages | Tests exist; requested 360/390/768/1280/1536 matrix not complete |
| Secret scan and em-dash scan | `scripts/scan-secrets.mjs` and repository scan | Not a browser test | Final command pending |
| Full signup-to-refund journey | No single journey test | Not present | Missing |

## Existing Playwright skips

Several existing specs intentionally guard viewport-specific assertions with
`test.skip` when run under another project:

- `e2e/auth-verification.spec.ts`: the persistent MongoDB auth journey runs
  only in Desktop Chrome to avoid duplicating test-account writes across
  browser profiles. UI resend interactions run in every configured project.
- `e2e/phase7-public.spec.ts`: the support-page viewport check is scoped to the
  iPhone 14 project.
- `e2e/upload.spec.ts`: upload wizard browser flow is scoped to iPhone 14.
- `e2e/phase6-admin.spec.ts`: admin mobile sheet check is scoped to iPhone 14.
- `e2e/accessibility.spec.ts`: axe checks are scoped to Desktop Chrome and
  iPhone 14.

Those checks do not represent full coverage of Desktop Safari, iPhone SE, or
iPad Pro. The full requested five-project matrix completed: 156 passed, 24
skipped, 0 failed, 180 total. The skip categories and project scope are listed
in [`link-report.md`](./link-report.md). The single
producer-signup-to-refund journey remains missing and is not represented as
covered by separate upload, checkout, admin, and payment tests.

The admin API tests specifically check foreign-origin rejection, scoped
step-up tokens, exclusion of password/PAN/Aadhaar/bank-account/IFSC values
from the issued token, missing password credentials, the separate
Playwright-admin opt-in, moderation and featured-state validation, report
decision validation, refund-reason validation, export type authorization,
and unauthenticated public report submission. They do not execute every admin
state change against a persistent database.
