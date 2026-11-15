# CLAUDE.md compliance audit

This is a repository and local-test audit, not a launch certification. A status of
`done` means the cited test or command passed in this verification pass. Code
that has not been exercised is marked `partial`.

| Requirement | Status | Evidence | Root cause if incomplete | Fix applied |
|---|---|---|---|---|
| 1. Use the reference for capability only and keep Astrylix branding original | partial | `src/config/site.ts`; public pages under `src/app/` | This pass did not compare every copy and asset against the reference | No design or copy redesign requested |
| 2. Visitor, buyer, producer, and admin MVP roles | partial | `src/server/auth/guards.test.ts`; `src/server/auth/admin-rejection.test.ts`; `e2e/account-menu.spec.ts` | The full signup-to-refund marketplace journey is not yet automated | Role-aware navigation was added and verified. End-to-end journey remains missing |
| 3. Next.js, TypeScript, Tailwind, MongoDB, Auth.js, R2, Razorpay, Zod, Vitest, Playwright | partial | `package.json`; `src/server/db/`; `src/server/storage/`; `npm run lint` | External R2, Google, and payment credentials are not exercised by local tests | Existing interfaces and mocked/test-only paths are retained |
| 3. Use a queue without requiring a paid service | intentional deviation | `src/server/jobs/queue.ts`; `src/server/jobs/queue.test.ts` | MongoDB is used for jobs rather than Redis/BullMQ | Retained the existing MongoDB-backed queue to avoid a new paid dependency |
| 4. Validate document and API shapes, model bounded data, index collections | partial | `src/lib/validations/`; `src/server/db/models/`; migration files | The audit did not establish that production migrations have been applied | No production database was touched |
| 4. Avoid raw request objects in database filters | partial | API validation modules and repository functions | A repository-wide security review was not in scope for this verification | Existing explicit parsing remains; no broad claim is made |
| 5. Launch in INR, with USD disabled | intentional deviation | `src/config/site.ts`; `src/server/payments/payments.test.ts`; `e2e/phase4-checkout.spec.ts` | International pricing and payment providers are not part of launch scope | INR-only behavior remains; USD display and payment are hidden |
| 5. GST, TDS, platform fee, and invoice rules | blocked by owner | `docs/PROJECT_STATE.md`; legal registry | Business and chartered-accountant decisions are absent | Kept tax and legal fields as placeholders. No rates were invented |
| 6. Payment fulfillment only after verified provider events | partial | `src/server/payments/payments.test.ts`; `src/app/api/webhooks/razorpay/` | Live Razorpay delivery and capture were not exercised | Unit coverage stays on mocked/test-mode provider behavior |
| 6. R2 originals private, signed download, ownership enforced | partial | `src/server/storage/r2.test.ts`; download routes under `src/app/api/orders/` | Real R2 credentials are not verified; local emulator is not configured | No storage emulator or dependency added without owner approval |
| 6. Exclusive purchase, refunds, idempotency, and download revocation | partial | `src/server/payments/payments.test.ts`; order and refund service tests | No complete browser journey currently proves all state transitions together | The full journey test remains an explicit gap |
| 7. Rights confirmation, report and takedown, legal placeholders | partial | `src/server/legal/legal-registry.test.ts`; `src/app/copyright-and-takedown/page.tsx`; upload routes | Legal text is draft text and needs professional review | Existing legal-review marker and registry are retained |
| 7. Final legal terms and privacy text | blocked by owner | `src/server/legal/legal-registry.ts`; policy pages | Only the owner and counsel can approve final legal text | No legal facts or final contract terms were invented |
| 8. SEO metadata, robots, sitemap, JSON-LD, noindex rules | partial | `src/app/seo-baseline.test.ts`; `src/app/seo-routes.test.ts`; sitemap route tests | The link crawl validates current local pages but does not prove search-engine ingestion or all device/browser behavior | Added a role-based local link crawl and route checks |
| 8. Producer pages and real-data landing pages | partial | `src/app/producer/[username]/page.test.tsx`; `src/app/beats/genre/[genre]/page.test.tsx`; `src/app/sitemaps/landings.xml/route.test.ts` | Data below configured thresholds intentionally does not produce an indexable page | Nonzero below-threshold data returns 200 with noindex and is excluded from sitemap. No matching data returns 404 |
| 8. Performance targets under production mobile throttling | partial | `scripts/measure-lab-vitals.mjs`; `npm run measure:perf:test` | No before baseline from this verification pass exists, and the lab interaction metric is not field INP | Added a reproducible production-build mobile throttle check. Current synthetic values are recorded in `docs/PROJECT_STATE.md`; before and production field values remain unavailable |
| 9. Use the existing light theme, semantic controls, and responsive layouts | partial | `e2e/accessibility.spec.ts`; `e2e/responsive.spec.ts`; `CLAUDE.md` | The full required device and route matrix was not yet run when this document was drafted | Existing visual system was not redesigned |
| 9. Use Spectrum UI source components for the admin panel | intentional deviation | `src/components/admin/`; no Spectrum tools available in this task | The prior user explicitly said to proceed without Spectrum UI | Existing local components were used; no source lookup is claimed |
| 10. Server-side admin authorization, step-up, and audit records | partial | `src/server/admin/step-up.test.ts`; `src/app/api/admin/admin-routes.test.ts`; `e2e/phase6-admin.spec.ts` | Browser and state-changing coverage is not exhaustive for every admin section | Admin access checks and existing test coverage remain |
| 11. Auth, NoSQL, upload, download, rate-limit, and headers baseline | partial | `src/server/auth/test-identity.test.ts`; `src/server/auth/rate-limit.integration.test.ts`; `src/server/storage/sniffer.test.ts` | External services and all adversarial API cases have not been independently reviewed | Tests use the isolated test database; no production test identity is enabled |
| 12. Strict TypeScript, lint, tests, and named service functions | done | `npm run lint`; `npm test` | None for the checks run in this pass | Lint script now runs ESLint with zero tolerated warnings and TypeScript |
| 12. No exposed credentials in tracked files | partial | `scripts/scan-secrets.mjs` and secret-scan output, when run | This audit's final secret scan is still required before sign-off | No credential values are copied into docs or source |
| 13. Stop after the requested audit and Phase 7 verification | done | This task scope | Later phases are out of scope | No later phase was started |
| 14. Report blockers and real verification evidence | partial | This audit, link report, feature URL map, test matrix, and project state | A complete producer-to-refund Playwright journey and external-service verification remain unimplemented | Documents distinguish tested, untested, and owner-blocked work |

## Verified root causes and repairs in this pass

| Finding | Root cause | Repair and regression evidence |
|---|---|---|
| Browsing cards did not link producer names | `/tracks` populated a producer display name but omitted the producer username | The page now resolves the producer directory and passes `producerUsername` to `BeatCard`; role-based link crawl exercises the browse page |
| Email-flow unit test unexpectedly contacted Resend | Vitest loaded `.env.local`; the test intended to verify development logging but inherited a real provider key | The test now explicitly stubs the provider key to `mock`; `src/server/email/email-flow.test.ts` passes without sending external email |
| Playwright URLs did not consistently match its test server | The app and auth base URL were inherited from the developer's local app URL rather than the test server origin | `scripts/run-playwright.mjs` overrides the app and auth URLs; `src/lib/playwright-env.test.ts` and the browser tests cover the behavior |
| Lint scanned generated Next output and failed on existing warnings | ESLint included generated Next route bundles, generated route types, and existing unused imports/parameters | ESLint ignores generated output, lint uses `--max-warnings=0`, unused lint items were removed or corrected |
| Payout terms link omitted explicit `noopener` | External link used only `noreferrer` | Added both required relations; `e2e/link-audit.spec.ts` now checks external links |
| One link-crawl test initially chose a language page with no seeded data | Seeded tracks are tagged `Instrumental`, not `Hindi` | The crawl now uses the real seeded language. Below-threshold/nonexistent landing pages return 404 by design |
| Producer accounts could open buyer order history and wrong-role pages got a generic requirement | `/dashboard/orders` allowed buyer, producer, and admin roles, and the guard used a fixed unauthorized role | Restrict order history to buyers and derive the correct buyer/producer requirement. `src/server/auth/guards.test.ts` and wrong-role cases in `e2e/link-audit.spec.ts` cover the repair |

## Owner and external-service blockers

- Final policy and license language must be approved by counsel.
- GST, TDS, invoicing, platform fee, and refund-window values need owner and chartered-accountant decisions.
- Razorpay Route eligibility and production account onboarding need owner confirmation.
- Real Razorpay webhooks, Cloudflare R2, Google OAuth, and production email delivery require credentials and were not invoked.
- A local S3-compatible emulator has not been added. Ask before adding Docker Compose or a new emulator dependency.
- Real-device iPhone testing and production-profile performance measurements require manual verification.
