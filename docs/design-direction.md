# Stage 1 design direction

## Direction and idea

The design skill dealt **The contact sheet**, seed `1449710596`, for the public catalog. The homepage treats actual published beats and their producer-defined license options as a listening sheet. The search form is the live interaction: it sends a real query to the catalog instead of inventing example results.

The skill's showcase mosaic and photo instructions were adapted because the repository has no real product photography, the task forbids hotlinked stock imagery and fake catalog content, and the application already has committed local demo covers. Catalog imagery therefore comes only from actual track records. When no cover or track exists, a purpose-made SVG waveform motif is used. There is no honest moving picture in the repository, so none is added.

The direction's 24-tile minimum and index-with-preview motion were not used. A fixed tile count would require fabricated beats, and index numbering conflicts with the approved brief. The actual catalog sections instead use compact beat cards, while playback is represented by the single-track equalizer and waveform progress system. No external photos or clips were used.

## Typography

- **Fraunces** is the display family for the wordmark and headings. Its shaped, editorial forms distinguish headings from generic interface text.
- **Noto Sans** is the text family. Its Latin and Devanagari subsets cover producer names in both scripts without switching to an unrelated fallback face.
- **IBM Plex Mono** is reserved for tabular BPM, key, price, and playback time values.

All three are loaded through `next/font/google`, which downloads the font files at build time and serves them from the application. System fallbacks remain configured for unavailable glyphs. Display sizes stay within the project limits: home title no larger than 44px on desktop or 30px on phones, and page titles 28px to 36px on desktop.

## Palette and contrast

The approved palette remains ink `#2C3947`, steel `#547A95`, brass `#C2A56D`, mist `#E8EDF2`, white, and derived neutrals. Brass is used for filled actions with ink text, not as text on white or mist. The contrast script checks the exact token values and requires at least 4.5:1 for normal text.

The existing ink on brass pairing measures **4.99:1**. Brass on white measures **2.36:1** and brass on mist measures **2.00:1**, so brass is not used as text on either surface. Steel text uses the darker steel token where necessary.

## Surfaces and layout

The layout uses a left-aligned text band, actual catalog imagery, varied white and mist sections, and a limited ink band for player and producer CTA surfaces. Shared containers use the 1280px maximum width and 16px, 24px, and 32px gutters. Borders stay thin, shadows are reserved for floating menus and dialogs, and controls and cards use the two documented radii.

## Motion

Motion tokens live in `src/lib/motion.ts` and the shared rules live in `src/app/motion.css`.

- A single requestAnimationFrame loop in the persistent audio provider samples stored waveform peaks only while audio is playing and the tab is visible. Equalizers listen for that one playback stream; tracks without peaks use a restrained CSS loop.
- The player waveform shows played and remaining portions and supports pointer, touch, and keyboard seeking.
- The SVG hero waveform uses transforms and pauses while offscreen, when the document is hidden, and under reduced motion.
- Beat cards use small pointer-only hover feedback. Scroll reveals are enhancement-only and never hide content before JavaScript runs.
- Feedback and entrance transitions use only transform and opacity. Reduced motion disables non-essential animation.

## Validation notes

The before measurement used the emulated iPhone 14 profile, 4x CPU throttling, 150 ms latency, and reduced motion. The after run used the same conditions and also added iPhone SE with normal motion. The interaction values below are Event Timing proxies, not field INP.

| Page | iPhone 14 before LCP | iPhone 14 after LCP | After interaction proxy | After CLS |
|---|---:|---:|---:|---:|
| Home | 516 ms | 868 ms | 48 ms | 0 |
| `/tracks` | 344 ms | 344 ms | 16 ms | 0 |
| Track detail | 328 ms | 348 ms | 16 ms | 0 |
| Producer profile | Not measured | 344 ms | 16 ms | 0 |

The home LCP increased by 352 ms from baseline; listing LCP was unchanged and track detail increased by 20 ms. All measured LCP values remain below the 2.5 s project target, CLS was 0, and interaction proxies were below 200 ms. The iPhone SE after LCP values were 1064 ms for home, 344 ms for `/tracks`, 348 ms for track detail, and 232 ms for the producer page. The home produced one observed long task per profile, 76 ms with reduced motion and 55 ms with normal motion; the script cannot attribute either task to animation. All other measured pages had zero observed long tasks.

The final design inspector run reported 5 FAIL and 3 WARN. Some checks are incompatible with the approved brief: the project requires monospace for BPM/prices, thin borders, three self-hosted type families, a maximum 44 px desktop hero, and real local catalog art instead of stock or hotlinked photos. The inspector also did not find an honest video clip. Its checks found 15 thin dividers, 4 outlined boxes, two card rows, and no photo/interface fragments because the covers and waveform motif are local illustrations. The production browser check did load the self-hosted Fraunces face; the inspector was run against the existing development server and reported its fallback face.

The final nine screenshots were captured from seeded local catalog records and visually inspected at 390, 768, and 1280 px for home, `/tracks`, and a live track. The reduced-motion, equalizer, overflow, and browser-error tests passed in all five requested Playwright profiles. Full test counts and known limitations are recorded in [PROJECT_STATE.md](./PROJECT_STATE.md).

This direction has no external image or video credits. Seeded demo covers and audio are local test fixtures and must be replaced with producer-owned content before launch.
