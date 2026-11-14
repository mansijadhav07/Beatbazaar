# Feature URL map

## Local setup checklist

1. Copy the documented variable names from `.env.example` into `.env.local`.
   Do not put credentials in source control.
2. Set `MONGODB_URI` to the application database and `MONGODB_TEST_URI` to a
   separate database whose name contains `test`. `npm run dev`, seeding,
   tests, and local admin bootstrap all use the isolated test database.
3. Configure `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and
   `NEXT_PUBLIC_APP_URL`. Playwright overrides the latter two to its test
   server's origin.
4. Run `npm run db:seed` for local demo accounts and local catalog records.
   This is development-only, refuses production, and prints newly generated
   passwords once per run. Re-running rotates the demo passwords.
5. Run `npm run dev` for the web app. It starts Next.js with
   `MONGODB_URI=MONGODB_TEST_URI`, so seeded accounts can log in and normal
   local development cannot accidentally connect to the application database.
   Run `npm run worker` only when testing
   the worker against a configured private/public R2 setup and the isolated
   test database.
6. Email is written to the development console when the provider is unset or
   set to `mock`. Playwright explicitly sets its test email provider to `mock`.
   For real local delivery, `EMAIL_SERVER_API_KEY` must be a valid Resend API
   key and `EMAIL_FROM` must be a sender address verified by that Resend
   account. Restart `npm run dev` after changing either value.
7. Local browsing, metadata, SEO routes, forms, and mocked payment UI can be
   tested without live Razorpay, Google, email, or R2 credentials. Upload
   storage, private downloads, production OAuth, real payments, and real email
   delivery require their corresponding external credentials. No emulator has
   been added.
8. USD and international payments are disabled at launch. `payoutsEnabled`
   defaults to false. No withdraw action is available.

### First local admin

There is no admin signup. Admins are created through the local bootstrap
command only:

```sh
ADMIN_EMAIL=admin@example.test ADMIN_PASSWORD='use-a-unique-local-password' npm run db:create-admin
```

The command requires `MONGODB_TEST_URI` to be distinct from `MONGODB_URI` and
to select a database with `test` in its name. It refuses to run in production.
The user must then sign in through `/login`. This process is for the isolated
local test database, not production provisioning.

### Email verification troubleshooting

Sign-up requires a verified email before password sign-in is allowed. A new
account can therefore exist even when its first verification email was not
delivered. On `/login`, an unverified account now gets a resend action. The
`/verify-email` page also accepts an email address and can request another
link. Both use the Better Auth `send-verification-email` endpoint.

The resend response intentionally does not disclose whether an account exists.
If the page reports that delivery failed, check the Resend API key and sender
in the provider dashboard, then restart the app. A successful provider request
can still be filtered by the recipient's mail service, so check spam and the
provider's delivery log as well.

## Route table

`Public` means no authenticated account is required. Role checks remain
server-side even when a navigation link is hidden.

| URL | Who can open it | Feature | Click path | Preconditions | Correct result |
|---|---|---|---|---|---|
| `/` | Public | Search, real catalog sections, genres | Wordmark or Home | Database may be empty | Only non-empty catalog sections render |
| `/tracks` | Public | Browse and search | Header Tracks, Home search | None | Published beats, filters, empty state |
| `/tracks?q=...&genre=...&language=...&minBpm=...&maxBpm=...&freeOnly=true&sort=...&page=...` | Public | Search, filters, sorting, pagination | Tracks filters | Matching real catalog entries | Filtered list, noindex and clean canonical |
| `/track/[id]/[slug]` | Public | Track details, preview, licenses | Beat card | Live track | Track and producer link, preview, license choices |
| `/producer/[username]` | Public | Producer profile and beats | Producer name on card, player, or track page | Producer profile; no live beats gives noindex | Profile data and live beats |
| `/beats/genre/[genre]` | Public | Genre landing | Home genre list | Real tracks exist | Real below-threshold data returns 200 with noindex; no matching data returns 404 |
| `/beats/language/[language]` | Public | Language landing | Search/filter or sitemap | Real tracks exist | Real below-threshold data returns 200 with noindex; no matching data returns 404 |
| `/beats/in/[city]` | Public | City beat landing | Location links | Real beats exist | Real below-threshold data returns 200 with noindex; no matching data returns 404 |
| `/producers/in/[location]` | Public | State or city producer landing | Producer/location links | Real producer profiles exist | Real below-threshold data returns 200 with noindex; no matching data returns 404 |
| `/cart` | Public | Cart | Header cart | None | Empty state or saved cart items |
| `/checkout` | Buyer | INR checkout | Cart checkout action | Signed-in buyer and available items | Exact INR amount and hosted test checkout |
| `/orders/[id]` | Buyer | Order, files, license | Account orders | Paid order belongs to buyer | Order details and authorized downloads |
| `/dashboard` | Buyer, producer, admin | Role-specific account home | Account menu | Signed-in role | Role-specific links, no fabricated metrics |
| `/dashboard/orders` | Buyer | Order history | Dashboard orders | Signed-in buyer | Own orders only |
| `/dashboard/profile` | Producer | Producer profile setup | Producer dashboard | Signed-in producer | Edit own profile |
| `/dashboard/beats` | Producer | Track management | Producer dashboard | Signed-in producer | Own beats and states |
| `/dashboard/beats/new` | Producer | Upload wizard | Upload beat action, mobile Upload | Signed-in producer; storage credentials for actual upload | Validated upload flow |
| `/dashboard/sales` | Producer | Sales view | Producer dashboard | Signed-in producer | Own sales only |
| `/dashboard/payouts` | Producer | KYC and payout status | Producer dashboard | Signed-in producer; `payoutsEnabled` is false by default | Status, terms, no withdraw button |
| `/admin` | Admin | Moderation | Admin link | Signed-in admin and step-up for mutations | Moderation queue |
| `/admin/reports` | Admin | Reports and takedowns | Admin sections | Signed-in admin | Report queue |
| `/admin/users` | Admin | User management | Admin sections | Signed-in admin | User list and guarded actions |
| `/admin/orders` | Admin | Orders and refunds | Admin sections | Signed-in admin | Order list and guarded refund |
| `/admin/payouts` | Admin | Payout administration | Admin sections | Signed-in admin | Payout queue |
| `/admin/featured` | Admin | Featured beats | Admin sections | Signed-in admin | Featured-content management |
| `/admin/settings` | Admin | Site settings | Admin sections | Signed-in admin | Settings and legal-review markers |
| `/admin/audit` | Admin | Audit log | Admin sections | Signed-in admin | Recorded admin actions |
| `/login` | Public | Sign-in and signup | Header/account menu | None | Buyer/producer sign-in and signup; admin signup rejected |
| `/verify-email` | Public | Email verification state | Auth email | Valid token for verification | Confirmation or actionable error |
| `/reset-password` | Public | Password reset | Auth email | Valid reset token | Password reset form |
| `/unauthorized` | Public | Wrong-role explanation | Redirect from protected route | Wrong authenticated role | Clear access message |
| `/terms` | Public | Terms placeholder | Footer | None | Draft with legal review marker |
| `/privacy` | Public | Privacy placeholder | Footer | None | Draft with legal review marker |
| `/refunds` | Public | Refund policy placeholder | Footer | None | Draft with legal review marker |
| `/delivery` | Public | Delivery policy | Footer | None | Delivery information and legal status |
| `/license-overview` | Public | License types | Header/footer | None | License overview and legal status |
| `/producer-guidelines` | Public | Producer rules | Footer | None | Guidelines with legal review marker |
| `/copyright-and-takedown` | Public | Copyright reporting | Footer | None | Takedown instructions and report form link |
| `/report` | Public | Report a beat | Track report action or takedown page | Track context or report details | Validated report submission |
| `/faq` | Public | FAQ | Footer | None | Visible FAQ and FAQ structured data |
| `/help` | Public | Help | Footer | None | Support guidance |
| `/contact` | Public | Contact | Footer | Contact configuration | Contact information |
| `/install` | Public | Install-as-app guidance | Footer | Supported browser | Manifest and install details |
| `/sitemap.xml` | Public | Sitemap index | Robots or direct URL | None | Index links to type-specific sitemaps |
| `/sitemaps/static.xml` | Public | Static route sitemap | Sitemap index | None | Public static URLs |
| `/sitemaps/producers.xml` | Public | Producer sitemap | Sitemap index | Real eligible profiles | Only producers with live beats |
| `/sitemaps/landings.xml` | Public | Landing sitemap | Sitemap index | Real eligible landings | Only threshold-qualified locations and genres |
| `/robots.txt` | Public | Crawler rules | Direct URL | None | Blocks admin, dashboard, API, cart, checkout |
| `/manifest.webmanifest` | Public | PWA manifest | Install page/browser | None | Manifest with configured theme color |
| `/api/health` | Public | Health response | Operations | None | Health status |
| `/api/auth/[...all]` | Public | Auth API | Login form | Valid request | Better Auth response |
| `/api/tracks/upload-url` | Producer | Upload presigning | Upload wizard | Signed-in producer and R2 configuration | Scoped upload URL or explicit configuration error |
| `/api/tracks/[id]/confirm` | Producer | Upload confirmation | Upload wizard | Own draft track and verified object | Queued processing or explicit error |
| `/api/tracks/[id]/play` | Public | Play counting | Player | Live track | Buffered play event |
| `/api/tracks/[id]` | Public | Track endpoint | Track page | Existing track | Track data or not found |
| `/api/cart/summary` | Buyer | Server-side cart pricing | Checkout | Signed-in buyer | Server-verified INR prices |
| `/api/orders` | Buyer | Create order | Checkout | Signed-in buyer and valid cart | Provider order or free order |
| `/api/orders/[id]/status` | Buyer | Order status | Confirmation | Own order | Current payment state |
| `/api/orders/[id]/items/[idx]/download` | Buyer | Private file download | Order page | Own paid, non-refunded order | Short-lived authorized download |
| `/api/orders/[id]/items/[idx]/license-pdf` | Buyer | License PDF | Order page | Own paid order | Generated license file |
| `/api/producer/profile` | Producer | Profile API | Profile setup | Signed-in producer | Validated own profile mutation |
| `/api/producer/beats` | Producer | Producer track API | Beats dashboard | Signed-in producer | Own track data |
| `/api/producer/payout-onboarding` | Producer | Route linked-account onboarding | Payout page | Payout feature enabled and provider credentials | Provider status without storing identity/bank secrets |
| `/api/producer/payout-sales.csv` | Producer | Sales export | Payouts/sales page | Signed-in producer | Own filtered sales CSV |
| `/api/reports` | Signed-in buyer, producer, or admin | Copyright or abuse report | Track report form | Same-origin request, signed-in account, live track, valid report body | Recorded report or explicit validation/rate-limit error |
| `/api/webhooks/razorpay` | Razorpay | Payment and Route webhook | Provider | Valid signature | Idempotent event processing |
| `/api/admin/step-up` | Admin | Re-authentication | Admin mutation | Admin session and valid proof | Step-up grant |
| `/api/admin/tracks/[id]` | Admin | Moderation mutation | Moderation queue | Admin plus step-up | State transition and audit log |
| `/api/admin/tracks/[id]/featured` | Admin | Feature toggle | Featured section | Admin plus step-up | State transition and audit log |
| `/api/admin/orders/[id]/refund` | Admin | Refund | Orders page | Admin plus step-up | Refund state and audit log |
| `/api/admin/reports/[id]` | Admin | Report action | Reports page | Admin plus step-up | Report state and audit log |
| `/api/admin/export` | Admin | CSV export | Admin tables | Admin session | Filtered export |
