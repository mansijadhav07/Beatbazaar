# CLAUDE.md

Project brief and working rules for building an online marketplace where producers sell music (beats) and artists buy licensed downloads. Read this file fully before writing any code. When a rule here conflicts with a default habit, this file wins.

TODO before starting: pick the product name and replace "the store" in UI copy. Do not reuse the reference site's name, logo, copy or images.

---

## 1. Reference site

Reference: https://beatstore.in/

Use it to learn structure and flows only. Build an original product with original branding, copy, layout details and imagery. Never copy text, images, icons or code from it.

What the reference does that we should match in capability:

- **Home page:** headline plus search bar (text search, plus mood/genre/artist search), suggested "type beat" searches, a trending beats section, genre browsing, a three step explainer (find, pick a license, download), license tier comparison, payment methods, featured producers, FAQ, and a "sell here" call to action for producers.
- **Beat browsing:** `/tracks` listing with filters (genre, BPM range, free only), genre landing pages, and a track detail page per beat. Every beat is previewable for free.
- **Producer profiles:** public page per producer with avatar, verified mark, location, follower count and their beats.
- **Licenses:** three tiers shown up front on every beat: Free, Non-Exclusive, Exclusive. Each lists which files are included (MP3, WAV, stems), ownership terms and usage rights. Producers set their own prices and terms.
- **Currency and payments:** price display switch between INR and USD. India: UPI, cards, net banking via an Indian payment gateway. International: cards in USD. Download unlocks the moment payment succeeds.
- **Seller onboarding:** free to start, own licenses and prices, payouts in INR.
- **Supporting pages:** terms, privacy, refund policy, delivery policy, FAQ, help, contact, blog, install-as-app page.

---

## 2. Product scope

### Roles

1. **Visitor:** browse, search, preview, view producers.
2. **Buyer (artist):** everything above plus cart, checkout, order history, re-download purchased files and license PDFs, favourites, follow producers.
3. **Producer (seller):** upload beats, set licenses and prices, view sales and payouts, manage profile. Needs KYC before first payout.
4. **Admin:** moderate uploads, handle takedowns and disputes, manage users, orders, payouts, featured content and site settings.

### Must have (MVP)

- Email and Google sign in, email verification, password reset.
- Producer upload flow: audio files (MP3, WAV, optional stems ZIP), cover image, title, genre, BPM, key, mood tags, "type beat" tags, license options and prices.
- Auto generated watermarked preview audio and waveform data. Originals are never publicly reachable.
- Public player with persistent mini player that keeps playing across page navigation.
- Search with filters and sort (trending, newest, price). Start with MongoDB text indexes and move to Atlas Search when needed. Keep the search layer behind an interface so it can be swapped.
- Cart and checkout, INR and USD pricing, order confirmation email, instant download.
- License PDF generated per order (buyer, producer, beat, license type, date, order id, terms).
- Exclusive purchase takes the beat off sale and cancels other non-exclusive listings for it atomically.
- Producer dashboard: beats, orders, earnings, payout status.
- Admin panel (section 8).
- Policy pages and a clear refund policy.

### Later

- AI or semantic search by mood and artist, recommendations, custom license contracts, producer CRM and email tools, coupons, bundles and sound kits, mobile app, producer subscription tiers, blogs.

---

## 3. Suggested stack

Change a choice only with a stated reason.

- **App:** Next.js (App Router) with TypeScript, strict mode.
- **Styling:** Tailwind CSS with design tokens in CSS variables. Headless primitives (Radix or equivalent) for accessible behaviour.
- **Icons:** `lucide-react` only.
- **Database:** MongoDB (Atlas, replica set so transactions work) with Mongoose or the official driver. Index definitions and backfills live in checked in `migrate-mongo` scripts.
- **Auth:** Auth.js or a managed provider. Session cookies, httpOnly, secure, sameSite.
- **File storage:** Cloudflare R2 through its S3 compatible API (`@aws-sdk/client-s3` with the R2 endpoint). Two buckets: `public` (cover art, watermarked previews) and `private` (originals, stems, license PDFs). Details below.
- **Audio processing:** background worker using ffmpeg to generate preview MP3, watermark and waveform peaks. Queue with BullMQ or a managed queue.
- **Payments:** Razorpay for INR (UPI, cards, net banking). Stripe or Razorpay international for USD. Use a marketplace payout feature (for example Razorpay Route or Stripe Connect) so producer splits and payouts are handled by a regulated provider, not by us holding funds in a bank account by hand.
- **Email:** transactional provider (Resend, Postmark or SES).
- **Validation:** Zod on every API boundary.
- **Tests:** Vitest for units, Playwright for the critical flows (upload, buy, download, exclusive purchase).
- **Observability:** Sentry for errors, structured logs.

Cloudflare R2 rules:

- The `private` bucket is never exposed on a public domain or public development URL. Originals, stems and license PDFs are reachable only through presigned GET URLs that expire in minutes, issued after an order and ownership check, with a download filename set through the response content disposition.
- The `public` bucket is served on a custom domain through Cloudflare with long cache headers and immutable, content hashed file names.
- Uploads go straight from the browser to R2 using presigned PUT URLs scoped to one key, one content type and a maximum size. After upload the server checks the object (size, type, checksum) before the audio worker touches it.
- Configure bucket CORS narrowly (our origins only). Keep R2 credentials server side, one API token per bucket with least privilege.
- Keys are random and never contain the buyer's or producer's personal data. Store only the key in MongoDB, never a full URL.

Suggested layout:

```
src/
  app/                 routes (public site, /dashboard, /admin, /api)
  components/          ui primitives and feature components
  server/              db, services, payments, storage, jobs
  lib/                 shared utils, validators, constants
migrations/            migrate-mongo scripts (indexes, backfills)
public/                static assets that actually exist in the repo
worker/                audio processing jobs
```

---

## 4. Core data model (MongoDB)

Use ObjectId for ids. Validate every document shape with Zod at the boundary and mirror it in Mongoose schemas or typed repository functions.

Collections:

- `users` (role: buyer, producer, admin; email; verified flag)
- `producer_profiles` (user id, username slug, display name, bio, avatar key, location as country, state and city chosen from a fixed list, verified flag, KYC status, payout account ref, follower count)
- `tracks` (producer id, title, genre, language, bpm, key, moods, tags, cover key, status: draft, pending, live, rejected, sold_exclusive, removed). Embed `files` (kind: preview, mp3, wav, stems; R2 key; size; checksum) and `licenses` (tier: free, non_exclusive, exclusive; price in minor units per currency; included files; terms version), because they are small, bounded and always read with the track.
- `orders` (buyer id, status, currency, totals, tax, fees, payment ref). Embed `items` as snapshots: track id, title, producer id and name, license tier, terms text and version, price paid. Later edits to a beat never change an old order.
- `downloads` (order id, item id, issued at, expires at, ip hash)
- `payouts` (producer id, period, gross, platform fee, net, status)
- `follows`, `favourites`, `reports` (takedown and abuse), `audit_logs`

Rules:

- Store money as integer minor units plus a currency code. Never doubles. Avoid Decimal128 unless a real need appears.
- Embed what is bounded and read together. Reference what is unbounded (orders per user, downloads, follows, plays).
- Indexes are defined in code and created by migration: compound index on tracks for `status`, `genre`, `bpm`, `createdAt`; text or Atlas Search index on title, tags, moods and producer name; unique indexes on slugs and on payment refs; TTL index for expired download tokens and checkout reservations.
- Slugs are unique and stable. Track URLs use the id plus a slug so renames do not break links.
- Never pass request bodies or query strings straight into a query or update. Whitelist fields through Zod, reject keys starting with `$` or containing dots, and build filters explicitly in repository functions.
- Use transactions only where atomicity matters (exclusive purchase, payout ledger) and keep them short.
- Tracks with orders are never hard deleted. Change status instead.
- Counters (followers, favourites) use `$inc`. Buffer play counts instead of writing on every play.

---

## 5. Pricing, currency and tax

- Producers set a base price per license in INR. USD price is either set by the producer or derived from a stored exchange rate with a clear rounding rule. Show the exact charged amount before payment.
- Buyer picks display currency, but the charged currency must always be explicit at checkout.
- India sales: GST handling and invoices must be correct. Ask the owner for the business GST setup before building invoices. Do not guess tax rules.
- Platform fee percentage is a setting, not a hardcoded value.

---

## 6. Payments and file delivery (security critical)

- Create the order server side, verify the payment webhook signature, and only then mark paid and issue downloads. Never trust the client redirect.
- Webhook handlers are idempotent. Handle duplicates, retries and out of order events.
- No card data touches our servers. Use the gateway's hosted checkout or elements.
- Download links are signed, expire quickly, and are rate limited. Log every download.
- Re-download is allowed from the order page for the account that bought it.
- Refunds: follow the published refund policy. A refund revokes download access and marks the license void.
- Exclusive purchase: reserve the track when exclusive checkout starts (short expiry, about 10 minutes, released on failure or expiry). On payment success, inside one MongoDB transaction, flip the track from `live` or reserved to `sold_exclusive` with a conditional `findOneAndUpdate` that matches the expected status, and pull its other licenses from sale. If nothing matches, do not issue downloads and refund automatically. Two buyers must never both win.

---

## 7. Content, rights and legal

Beats are copyrighted works and sampling is a real risk.

- Producers confirm at upload that they own all rights and have cleared any samples. Record the confirmation with a timestamp.
- Provide a report and takedown flow, and a documented process for handling infringement claims.
- Free license beats still carry stated terms (credit the producer, limits on use).
- Do not write final legal text. Draft placeholders clearly marked `LEGAL REVIEW REQUIRED` for terms, privacy policy, refund policy and license agreements, and flag them for a lawyer.
- Comply with Indian data protection requirements. Collect only what is needed.

---

## 8. SEO and performance

Technical SEO

- Server render every public page (SSR or ISR). Nothing important may depend on client side rendering. Use the Next.js metadata API for unique title, description, canonical and Open Graph per page.
- One canonical URL per page. Filter, sort and pagination parameters are canonicalized to the clean listing URL, and only defined combinations (a genre, a language, a location) get indexable landing pages. Everything else is `noindex, follow`.
- Clean, lowercase, hyphenated URLs. Renamed or moved pages return a 301. Removed beats return 410 or a helpful page that links to similar beats, never a soft 404.
- `sitemap.xml` as a sitemap index split by type (beats, producers, genres, locations, blog) with accurate `lastmod`. `robots.txt` blocks `/admin`, `/dashboard`, `/api`, cart and checkout.
- Structured data in JSON-LD, validated: `Organization`, `WebSite` with `SearchAction`, `BreadcrumbList` on every deep page, `MusicRecording` plus `Product` with `Offer` (price, `priceCurrency`, availability) on track pages, `ProfilePage` with `Person` or `MusicGroup` on producer pages, `FAQPage` where an FAQ is visible.
- `hreflang` for `en-IN` and `en-US` (and `x-default`) only if the content actually differs. Do not create duplicate pages just for currency.
- Generated Open Graph and Twitter images per beat (cover, title, producer, BPM, price).
- Internal linking: breadcrumbs, related beats, same producer, same genre, same city. Every indexable page is reachable within three clicks and appears in the sitemap.
- Core Web Vitals targets: LCP under 2.5 s, INP under 200 ms, CLS under 0.1 on a mid range phone over 4G. Use `next/image` with explicit sizes, modern formats and lazy loading, self host fonts with `font-display: swap`, keep third party scripts deferred.
- Audio is streamed in chunks with metadata preload only. Never autoplay with sound.
- Set up Google Search Console and Bing Webmaster Tools, and track Core Web Vitals in production.

Location based SEO

- Capture producer location as structured data (country, state, city from a fixed list), not free text.
- Generate location landing pages from real data, for example `/producers/in/mumbai`, `/producers/in/maharashtra` and `/beats/in/mumbai`. Create a page only when it has enough real content (a minimum number of producers or beats, set in config). No thin pages, no doorway pages, no swapping a city name into identical text.
- Each location page has unique content built from data: producer list, top beats, genres and languages most common there, counts, and a short factual intro. Add `BreadcrumbList` and an `ItemList`.
- Language and regional genre pages (Hindi, Punjabi, Marathi, Tamil, Telugu, Bengali, Haryanvi and similar, plus regional "type beat" pages) follow the same quality rule.
- The brand is an online store, so use `Organization` with `areaServed` for India and do not mark up fake `LocalBusiness` addresses. If a real business address exists, add it on the contact page only.
- Default currency and region hints may use the visitor's country (for example the Cloudflare `CF-IPCountry` header), but never redirect or change page content by IP for crawlers. Each URL must return the same indexable content to everyone, and the currency switch is a user setting.
- Keep NAP style details (business name, contact) identical across the site, footer, contact page and structured data.

---

## 9. UI and design (applies to all frontend work, including the admin panel)

1. **Design tools.** Before building any UI, use the `tasteskill` skill and the Spectrum UI MCP
   whenever they are available in the session. If either is missing, say so up front and do not
   pretend to have used it. Do not silently substitute a lookalike.
2. **No em dashes.** Never use the em dash character anywhere: UI copy, labels, placeholders,
   toasts, error messages, comments, docs, commit messages. Use a period, comma, colon or
   parentheses instead. Hyphens in compound words and ranges are fine.
3. **It must not look AI generated or "vibecoded".** Specifically avoid:
   - purple to blue gradients, gradient text, glowing blobs, neon accents
   - glassmorphism and heavy blur as the main visual idea
   - emoji used as icons or decoration
   - every element being a giant rounded card with the same shadow
   - centered hero copy with a generic icon-in-a-circle above every section
   - placeholder lorem ipsum, fake logos, fake testimonials, fake metrics
   - generic headings like "Welcome back!", "Unlock the power of ..."
4. **Real assets only.** Use proper vector icons from the icon set already in the project
   (`lucide-react`) or purpose-made SVG. Use real images that exist in `public/`. Never
   hotlink random stock images, never leave broken image paths, never use emoji as icons.
   Cover art on seeded or demo beats must be generated or licensed assets committed to the repo.
5. **Palette.** Build a disciplined system around this palette:
   - ink `#2C3947`, steel blue `#547A95`, brass `#C2A56D`, mist `#E8EDF2`, plus white
   - neutral tints derived from these. Status colours (success, warning, danger) must be
     muted and used only for meaning, never for decoration.
   - Light theme. Meet WCAG AA contrast.
6. **Craft.** Strong typographic hierarchy, a consistent 4/8px spacing scale, restrained radii
   (one or two values), thin borders over heavy shadows, dense but readable data tables,
   clear empty, loading and error states, keyboard focus styles, responsive from phone up.
   (Most buyers will arrive on a phone, so design the browse, player and checkout flows
   mobile first, and make the admin panel work down to tablet.) Copy is plain, specific and
   written for the person using it.
7. **Destructive actions** always get a confirmation that names what will happen, and the
   admin panel requires step-up re-authentication for every change.

### Brand and motion

- Light theme stays. Dark mode and a theme switcher are out of scope. Solid ink (`#2C3947`)
  is allowed for the player bar and a limited number of section bands. The palette stays ink,
  steel blue, brass, mist, white, and derived tints.
- Purposeful motion is allowed under the rules in B2 of the approved Stage 1 brief.
  Decorative animation is not.
- Everything else in this section still applies, including sizing, no gradients, no glow,
  no glassmorphism, no emoji, 40px desktop and 44px touch controls, a 16px base size, and
  two restrained radii.

Sizing, responsiveness and iOS (mandatory)

- **Standard sizes, not zoomed in.** The UI must look like a normal modern web app at 100% browser zoom. Base font 16px (`1rem`). Body text 15 to 16px, secondary text 13 to 14px, never below 12px. Headings stay modest: page title about 28 to 36px on desktop and 24 to 28px on phones, section titles 20 to 24px. No giant hero type, no oversized buttons, icons or paddings. Use `rem`, never viewport-unit font sizes. Never use `transform: scale` or CSS `zoom` to fit a layout.
- **Control sizes.** Buttons and inputs 40px tall on desktop, 44px on touch devices (minimum tap target 44 by 44). Icons 16, 20 or 24px. Content container max width 1200 to 1280px with sensible gutters (16px phone, 24px tablet, 32px desktop).
- **Breakpoints.** Design for 360, 390, 430, 768, 1024, 1280 and 1536px widths. Phones use a single column and a bottom aware player, tablets two or three columns, desktop a full grid. No horizontal scrolling at any width, and no fixed widths on containers.
- **Test matrix.** iPhone SE, a current iPhone (including a Pro Max size), iPad portrait and landscape, a mid range Android phone, a laptop and a large desktop. Playwright projects must include `webkit` with iPhone and iPad device profiles, and a final manual check on a real iPhone.
- **iOS and Safari.** Use `viewport-fit=cover` and respect safe areas with `env(safe-area-inset-*)` on the sticky header, the player and bottom bars. Use `100dvh` or `svh`, never raw `100vh`. All form inputs use at least 16px font size so Safari does not zoom on focus. Add `touch-action: manipulation` on controls to remove tap delay. Audio only starts from a user gesture and is unlocked on the first tap. Use the Media Session API for lock screen and control center controls. Keep keyboard and fixed bottom bars from overlapping inputs. Avoid `backdrop-filter` on large areas and heavy box shadows (Safari performance). Provide `apple-touch-icon`, a web manifest and `theme-color` for the install-to-home-screen experience.
- **Input and motion.** Support touch, mouse and keyboard equally, visible focus states, `prefers-reduced-motion` respected, light animation only. Dark mode is out of scope for now.

Product specific UI notes:

- The beat card is the core component: cover, title, producer, genre, BPM, play control, lowest price, one clear action. Keep it compact so a grid shows many beats.
- The player is a persistent bar with play, seek, volume, queue and a buy action. Keyboard accessible (space to toggle, arrows to seek).
- License choice shows files included, ownership and usage rights in plain words before the buy button. No hidden terms.
- Checkout is one page, minimal fields, price and currency always visible.

---

## 10. Admin panel

- Separate route group with its own layout, role checked on the server for every request, not only in the UI.
- Step-up re-authentication for every state changing action.
- Sections: beat moderation queue, reports and takedowns, users, producers and KYC, orders and refunds, payouts, featured content, settings, audit log.
- Every admin action writes an `AuditLog` row (who, what, before, after, when).
- Dense, filterable, sortable tables with pagination and CSV export.

---

## 11. Security baseline

- Validate and sanitize all input with Zod. Prevent NoSQL injection: never pass raw request objects into MongoDB filters or updates, and reject `$` operators and dotted keys from user input.
- Authorization checks on every route and server action: users can only touch their own beats, orders and downloads.
- Upload checks: type sniffing (not just extension), size caps, virus scan hook, store under random keys.
- Rate limit auth, search, upload and download endpoints.
- CSRF protection on cookie authenticated mutations. Strict security headers and CSP.
- Secrets only in environment variables. Never commit `.env`. Provide `.env.example` with every key listed and no real values.
- Hash passwords with argon2 or bcrypt if we manage passwords. Prefer provider auth.

---

## 12. Engineering conventions

- TypeScript strict, no `any` without a comment explaining why.
- Small, named, testable service functions in `server/`. Route handlers stay thin.
- One feature per branch, small commits, imperative commit messages with no em dashes.
- Every new endpoint ships with validation, authorization and at least one test.
- No dead code, no commented out blocks, no TODO without an issue reference or owner.
- Accessibility is part of done: labels, focus order, alt text, reduced motion respected.

Commands (create these scripts early and keep them working):

```
npm run dev        start the app
npm run worker     start the audio processing worker
npm run lint       eslint and type check
npm run test       unit tests
npm run e2e        playwright critical flows
npm run db:migrate apply migrate-mongo migrations and create indexes
npm run db:seed    seed demo data with real committed assets
```

---

## 13. Build order

Work in this order and finish each phase end to end before starting the next.

1. Project setup, design tokens, layout, auth, MongoDB models and indexes, R2 client.
2. Producer upload pipeline: storage, preview generation, waveform, moderation status.
3. Browse, search, filters, track page, persistent player.
4. Licenses, cart, checkout, payment webhook, signed downloads, license PDF, emails.
5. Producer dashboard, earnings, payouts, KYC.
6. Admin panel, reports and takedowns, audit log.
7. SEO pages, policy pages, performance pass, accessibility pass.
8. Later items from section 2.

---

## 14. How to work with me

- Before a large task, state the plan in a few lines and list any assumption that needs my confirmation, especially anything about tax, legal text, payouts or pricing.
- If a required tool or skill is unavailable, say so. Do not fake it.
- Do not invent business facts (fees, tax numbers, company details). Ask or leave a clearly marked placeholder.
- When finishing a task, summarize what changed, how to run it, and what is left.