# Admin UI components

The admin UI follows the light Beatbazaar tokens, sentence-case labels, 16px form
controls, and 4px or 6px radii. No component is installed by the Spectrum UI CLI.

| Component | Spectrum source | Status | Changes |
| --- | --- | --- | --- |
| Data table | `data-table` | Rejected | Spectrum's table requires Motion. The existing `src/components/ui/table.tsx` is used with URL-based server sorting, filtering, and pagination instead. |
| Pagination | `data-table` | Adapted locally | Pagination links retain the active URL filters and use server-rendered result counts. No table library was added. |
| Tabs | `faq-tabs-card` | Adapted | Read the registry source at `https://ui.spectrumhq.in/r/faq-tabs-card.json`. Kept the active-item pattern, removed the unrelated FAQ accordion, sample content, pill styling, dark theme, and Motion. Admin section tabs are links so filters remain server-driven. |
| Confirmation dialog | `hold-to-confirm` | Rejected | The only Spectrum confirmation result was a press-and-hold animation. It is not appropriate for confirmation or step-up re-authentication. An accessible Radix dialog from the existing dependency is used instead, with the target and consequence named. |
| Drawer or sheet | `animated-drawer` | Rejected | Spectrum's drawer requires additional animation and measurement packages. The prior Phase 3 bottom-sheet component was not present in the repository, so the admin mobile navigation uses the existing Radix Dialog dependency in a bottom-sheet layout. |
| Badge | Not available from returned source | Local primitive | Status labels use `StatusBadge` with muted project status tokens and no decorative icons. |
| Select | Not sourced | Native control | Filters use labelled native `select` elements with project tokens and touch-sized controls. |
| Toast | Not available from returned source | Local primitive | Action feedback uses an `aria-live` message with semantic status colors and no motion. |
| Empty state | Not available from returned source | Existing primitive | `EmptyState` uses the existing Card and text styles. It shows a real zero or a clear unavailable state, never sample records. |
| Stat card | Not available from returned source | Existing primitive | `StatCard` composes the existing Card component and renders only values computed from stored records. |
| Date range picker | `datetime-picker-year-range` | Rejected | The docs page returned 404 and the admin needs only date bounds. Filters use native `input type="date"` controls. |

## Admin behavior notes

- Every admin mutation requires a fresh password confirmation bound to the signed-in
  session, action, and target record. A confirmation expires after five minutes and
  is consumed once. Admins who signed in without a password must set one before
  changing records.
- Admin actions that moderate a beat, change featured placement, resolve or dismiss
  a report, take down a beat, or refund an order write audit records in the same
  database transaction as the change.
- A takedown removes the beat from public listings. Existing orders and licenses
  are not changed by this action.
- User and producer KYC pages show provider status and required action flags only.
  Identity documents and financial account details are not part of the admin UI.
- Settings are read-only because the project has no approved database-managed
  settings workflow. Refund-window values remain placeholders, and tax and invoice
  decisions are marked `LEGAL REVIEW REQUIRED`.
- CSV exports are administrator-only, formula-escaped, and limited to 10,000 rows
  per export. Narrow the server-side filters for larger result sets.
- The Playwright identity bypass requires a loopback host, the explicit test-mode
  flag, and the test secret configured only by `playwright.config.ts`.
