# Feature test matrix

This matrix distinguishes tests that exist from tests actually run in the current
verification. Vitest and Playwright names are cited so a result can be reproduced.

| Feature | Unit/integration evidence | Browser evidence | Status in this pass |
|---|---|---|---|
| Signup role validation, admin rejected | `src/server/auth/admin-rejection.test.ts`; `src/server/auth/auth-integration.test.ts` | `e2e/auth-verification.spec.ts` | Unit and role checks passed |
| Login, session, verification, reset, Google account linking | `src/server/email/email-flow.test.ts`; `src/server/auth/auth-integration.test.ts`; `src/server/auth/account-linking.test.ts` | `e2e/auth-verification.spec.ts` covers signup, resend, unverified rejection, verification, and verified sign-in; Google OAuth callback requires external credentials | Local auth journey and link policy passed; Google callback and password-reset delivery remain provider-config dependent |
| Role protection and safe redirects | `src/server/auth/guards.test.ts`; `src/middleware.test.ts`; `src/lib/safe-return-path.test.ts` | `e2e/link-audit.spec.ts` guest redirect and account-menu role cases | Passed |
| Producer profile and public page | `src/app/producer/[username]/page.test.tsx`; catalog tests | `e2e/phase2-journey.spec.ts` creates the profile | Profile setup covered in lifecycle; public profile route still partial |
| Upload validation, file sniffing and size limits | `src/server/storage/sniffer.test.ts`; `src/lib/upload-files.test.ts`; `src/app/api/tracks/upload-url/route.test.ts` | `e2e/upload-edge-cases.spec.ts` rejects fake and oversized audio | Passed in targeted Desktop Chrome run |
| Multipart upload | Upload confirmation validation | `e2e/upload-edge-cases.spec.ts` verifies mocked multipart parts and ETags | Passed in targeted Desktop Chrome run; real R2 not exercised |
| Worker audio preview and waveform | `src/server/audio/transcoder.test.ts`; `src/server/jobs/queue.test.ts` | `e2e/phase2-journey.spec.ts` runs the worker processor against in-memory storage | Worker processing passed locally; real R2 remains unverified |
| Moderation approval/rejection and emails | `src/server/catalog/revalidation.test.ts`; admin route tests | `e2e/phase2-journey.spec.ts` approves the generated beat | Approval covered; rejection and email delivery are not part of this journey |
| Browse, search, filters, sort, pagination | `src/server/catalog/repository.test.ts`; public catalog tests | `e2e/browse-and-player.spec.ts`; link crawl routes | Partial; full matrix pending |
| Track statuses, producer links, SEO | SEO and catalog tests | Link crawl checks routes and links | Partial |
| Persistent player and play counting | Track/play service tests | `e2e/browse-and-player.spec.ts`; `e2e/phase4-checkout.spec.ts` | Partial |
| Cart and free license flow | Payment tests | `e2e/phase4-checkout.spec.ts` empty cart/checkout UI | Partial |
| Paid checkout with mocked provider | `src/server/payments/payments.test.ts` | Phase 4 checkout spec asserts server order request and INR total | Partial |
| Price tampering, exclusive race, webhook signature/idempotency | `src/server/payments/payments.test.ts` | Not a complete buyer journey | Unit coverage passed |
| Download ownership, license PDF, order history, refunds | Payment/order tests | `e2e/phase2-journey.spec.ts` downloads a paid order, refunds it, and checks token revocation | Download and refund lifecycle passed; license PDF and order-history browser coverage remain partial |
| Earnings ledger and payouts off/on | `src/server/payouts/payouts.test.ts`; payout onboarding route test | `e2e/phase5-payouts.spec.ts` mocked provider | Partial; matrix pending |
| Reconciliation mismatch | Payout tests, if listed by implementation | No external reconciliation run | Partial |
| Admin sections, step-up, audit log | `src/app/api/admin/admin-routes.test.ts`; `src/server/admin/step-up.test.ts` | `e2e/phase6-admin.spec.ts` settings/navigation | Partial |
| Public report and takedown | `src/app/api/reports/route.test.ts`; legal registry tests | `e2e/public-report.spec.ts` submits a report anonymously with contact email | Public submission passed; takedown admin action remains partial |
| Featured content | Admin route tests | Admin UI not fully crawled for action behavior | Partial |
| Sitemap, robots, canonicals, JSON-LD | `src/app/seo-baseline.test.ts`; `src/app/seo-routes.test.ts`; sitemap and structured-data tests | `e2e/phase7-public.spec.ts`; link crawl | Partial |
| Policy pages and legal text guard | `src/server/legal/legal-registry.test.ts` | Phase 7 public pages | Partial |
| Rate limiting | `src/server/auth/rate-limit.test.ts`; isolated Mongo integration test | Not exercised against production | Passed locally |
| Security headers | No end-to-end header matrix identified | Not asserted in link crawl | Missing |
| Axe accessibility | Existing `e2e/accessibility.spec.ts` | Home, tracks, track, producer, cart, checkout, login, dashboard, admin settings on Desktop Chrome and iPhone 14 | Tests exist; full matrix pending |
| Responsive overflow | Existing `e2e/responsive.spec.ts` | Selected test pages | Tests exist; requested 360/390/768/1280/1536 matrix not complete |
| Secret scan and em-dash scan | `scripts/scan-secrets.mjs` and repository scan | Not a browser test | Passed in final verification; no credential findings or em-dash matches in changed files |
| Full signup-to-refund journey | Signup, email verification, payment webhook, download and refund service paths | `e2e/phase2-journey.spec.ts` covers producer signup and verification, profile, upload, worker processing, approval, buyer catalog search, mocked checkout, download, refund, and revocation | Passed in Desktop Chrome |

`npm run smoke:local` is implemented but real R2, worker-on-R2, and Razorpay
test-order checks were not run in this pass. Its production refusal was
verified. The configured R2 bucket names do not pass its test-bucket guard.

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
iPad Pro. The earlier full five-project matrix completed: 156 passed, 24
skipped, 0 failed, 180 total. In this repair pass, the targeted lifecycle,
upload-edge, and public-report specs completed with 5 passed, 20 skipped, and
0 failed across Desktop Chrome, Desktop Safari, iPhone 14, iPhone SE, and iPad
Pro 11. The targeted specs intentionally run only in Desktop Chrome to avoid
duplicate database writes and repeated large sparse-file operations. The
lifecycle is covered by one end-to-end test, not inferred from separate tests.

The admin API tests specifically check foreign-origin rejection, scoped
step-up tokens, exclusion of password/PAN/Aadhaar/bank-account/IFSC values
from the issued token, missing password credentials, the separate
Playwright-admin opt-in, moderation and featured-state validation, report
decision validation, refund-reason validation, export type authorization,
and unauthenticated public report submission. They do not execute every admin
state change against a persistent database.
