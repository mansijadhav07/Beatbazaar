# Link and redirect report

## Scope and method

The automated crawl is [e2e/link-audit.spec.ts](../e2e/link-audit.spec.ts). It
starts at the homepage, visits the role-visible route sets, expands sitemap
locations, inspects rendered anchors, checks external-link relations, checks
canonical origins and trailing slashes, tests downloads through same-origin
fetch, and compares desktop and mobile navigation. Guest protected-route return
paths are covered in the same spec.

The crawl is a local application test, not a crawl of a deployed site. The
transactions and provider integrations are not invoked by the crawl.

## Findings and repairs

| Finding | Root cause | Repair | Evidence |
|---|---|---|---|
| Producer names in `/tracks` were not links | Track cards had no producer username even though home cards could resolve it | Resolve producer directory rows and pass usernames through to `BeatCard` | `src/app/tracks/page.tsx`; `e2e/link-audit.spec.ts` |
| Razorpay terms link lacked explicit `noopener` | The external onboarding link used `rel="noreferrer"` alone | Set `rel="noopener noreferrer"` | `src/app/dashboard/payouts/OnboardingForm.tsx`; link crawl |
| Dead genre and license fragment destinations | Header/footer used hash targets without matching page anchors | Link to `/tracks` and `/license-overview` | `src/components/layout/header.tsx`; `src/components/layout/footer.tsx` |
| A Hindi language route was used as the seeded crawl fixture but had no real catalog data | The development seed only creates tracks with the `Instrumental` language | Crawl uses the actual seeded language. Other below-threshold routes may return 404 and are excluded from sitemap | `src/server/db/seed.ts`; `src/app/beats/language/[language]/page.tsx`; link crawl |
| Unauthenticated users could lose a protected URL query while being sent to login | Middleware previously kept only the pathname | Preserve the full relative path and query in the login return parameter and reject unsafe external return paths | `src/middleware.ts`; `src/lib/safe-return-path.test.ts`; guest case in link crawl |
| Producers could open buyer order history, and the wrong-role explanation did not identify buyer pages | The order-history route accepted every role and the guard used a fixed `producer` requirement | Restrict order history to buyers and derive the required role from the route guard | `src/app/dashboard/orders/page.tsx`; `src/server/auth/guards.test.ts`; wrong-role cases in link crawl |

## Current expected behavior

- `/dashboard`, `/checkout`, and `/orders/*` redirect guests to `/login` with
  their intended relative return path.
- Admin pages return 404 to a non-admin role.
- Producer and buyer dashboard pages show an unauthorized message when the
  role is wrong.
- A producer with a profile but no live beats is noindex and omitted from the
  producer sitemap. A landing with nonzero data below threshold returns 200
  with noindex and is omitted from its sitemap. A route with no matching data
  returns 404.
- Canonicals use the configured application origin. Query-filtered track pages
  canonicalize to `/tracks`.
- The homepage, header, footer, desktop navigation, mobile menu, role account
  links, and mobile bottom navigation are checked in the browser.

## Remaining link-audit limits

- Email link templates are checked through configured URL helpers and source
  template review, but email provider delivery is deliberately mocked locally.
- Login, logout, email verification, and password reset were not all exercised
  as one real-account browser journey in this crawl.
- Redirect behavior for renamed tracks and removed tracks is not covered by
  this crawl unless a matching database fixture is present.
- External destinations are not contacted. Their `rel` attributes are checked.

## Final browser-matrix result

The requested five-project run completed with 156 passed, 24 skipped, 0
failed, 180 total. The skips are intentional project-specific checks:

- The four axe cases in `e2e/accessibility.spec.ts` run only on Desktop Chrome
  and iPhone 14. They are skipped on Desktop Safari, iPhone SE, and iPad Pro
  11, for 12 skips.
- The admin mobile sheet, public support mobile check, and upload wizard in
  `e2e/phase6-admin.spec.ts`, `e2e/phase7-public.spec.ts`, and
  `e2e/upload.spec.ts` are iPhone 14-specific. Each is skipped on Desktop
  Chrome, Desktop Safari, iPhone SE, and iPad Pro 11, for 12 skips.

The latest link audit passed its route, navigation, canonical, redirect,
role, and external relation assertions.
