# Portfolio audit — 29 September 2026

Prepared for MrMochi. Implementation is described in [the accompanying plan](2026-09-29-implementation-plan.md).

## Assessment

The static Astro architecture is a good fit for this portfolio. The most useful next changes are to update vulnerable build dependencies, correct the scroll affordances, improve accessibility, deliver correctly sized gallery images, and make work and contact information quicker to reach. A framework rewrite or CMS migration is not needed to address these findings.

This audit covers the current working tree at commit `27bfdf3b`, including six pre-existing modified files. Those changes are preserved. Some improvements are already implemented locally but are absent from the deployed site; they are identified separately below.

## Scope and evidence

- Reviewed routes, shared layouts/components, content schema, all 17 project records, styles, image tooling, dependency tree, tests, and deployment workflow.
- Clean production build and Vitest verification: **21 pages generated; 116 tests passed across 8 files**.
- Parsed every generated HTML page to check internal routes, fragment destinations, duplicate IDs, and H1 counts. No missing internal destinations or duplicate IDs found; every local page has one H1.
- The existing asset integrity test passes for references it covers. It does not validate video `poster`/`data-src`, CSS font URLs, or third-party link availability comprehensively.
- Browser review of the local homepage, About, Behind the Scenes, and A Long Goodbye at 1280 × 720 and 390 × 844; exercised mobile disclosure, Escape, project lightbox, focus return, and the project-to-contact journey.
- Compared the deployed homepage and About page with the local build. The deployed generator reports Astro 7.2.2. Production is behind the current local editorial changes.
- Live npm registry checks: `npm outdated`, `npm audit`, and selected upgrade compatibility queries. Official advisories and documentation checked on the audit date.
- Ran the accessibility skill's static scanner on generated output and reviewed its findings. Six findings incorrectly treated CSS as HTML; its remaining captions warning concerns the decorative muted hero. These seven flags are not counted as confirmed violations. The confirmed accessibility findings below come from manual inspection and calculation.

**Limits:** This is a whole-codebase and generated-site audit with representative browser testing. It is not a WCAG certification or an exhaustive physical-device, screen-reader, or cross-browser test. No Lighthouse/CrUX scores, throttled network waterfall, authenticated GA4 configuration, external-link crawl, full trailer playback/caption verification, or full factual verification of film credits/awards was completed. Performance estimates are distinguished from measured values.

## Existing strengths

Static rendering keeps application JavaScript small. Images have intrinsic dimensions, responsive candidates, eager hero loading, and lazy galleries. Fonts are self-hosted. The site has a skip link, semantic credit/spec lists, native dialogs with named close buttons, reduced-motion CSS, mobile-menu Escape handling, and a usable static navigation fallback. Canonicals, sitemap, social metadata, and structured data are already present. Clean builds and pruning prevent old output and many unused originals from shipping.

The mobile menu opened, closed with Escape, and reset after navigation. The tested lightbox opened, closed with Escape, restored focus to its trigger, and released scroll locking. The project contact link landed with the contact section 96px below the viewport top. These are working behaviors to preserve.

## Priority definitions

| Priority | Meaning |
| --- | --- |
| P1 | Next implementation batch: meaningful defect, accessibility barrier, or security maintenance |
| P2 | Following batch: substantial performance, discoverability, or maintainability improvement |
| P3 | Optional refinement requiring measurements or editorial decisions |

No confirmed public-site outage or remotely exploitable static-host endpoint was found. Advisory severity and implementation priority are different measures.

## Findings

### A01 — Vulnerable and outdated build dependencies · P1 · confirmed

The registry audit reports **8 affected package entries: 1 critical, 4 high, 3 moderate**. Entries are not eight independent exploits; Vitest/mocker and Astro/Sharp overlap.

| Installed package | Installed version | Advisory category | Patched floor identified |
| --- | --- | --- | --- |
| Astro | 7.2.2 | Critical AVIF processing; additional path-boundary issue | 7.2.8 for AVIF; use current 7.3.5 target |
| Sharp | 0.35.3 | High libheif vulnerabilities | 0.35.4 |
| SVGO | 4.0.2 | High SVG sanitization bypass | 4.1.0 |
| js-yaml | 4.3.1 | High merge-source CPU exhaustion | 4.3.2 |
| smol-toml | 1.6.1 | High malformed-document denial of service | Above 1.7.0 |
| devalue | 5.8.1 | Moderate malformed-input denial of service | 5.9.1 |
| Vitest | 4.1.10 | Moderate redirect-mock arbitrary file read | 4.1.11 |
| @vitest/mocker | 4.1.10 | Same Vitest advisory | 4.1.11 |

The Astro advisory requires processing an untrusted AVIF. This project has static output, local curated images, and no configured remote-image upload or public image-processing endpoint. The vulnerable packages principally affect build/development tooling here. No vulnerable-input exploit was attempted. Upgrade the dependency graph and re-audit rather than interpreting the severity as proof the deployed static pages are compromised. [Astro advisory](https://github.com/advisories/GHSA-26w7-cxv4-gfx2), [Sharp advisory](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c), [Vitest advisory](https://github.com/advisories/GHSA-82fw-gwwq-j7x9).

The deployment workflow also pins Node 22.12.0, while the local runtime is 22.23.1. Align development and CI on a current patched Node 22 release; 22.23.3 was verified on the audit date. [Node release](https://nodejs.org/en/blog/release/v22.23.3).

### A02 — Scroll affordances do not consistently continue into content · P1 · confirmed

`ProjectHero.astro` defaults `scrollTarget` to `main`. The local About and Behind the Scenes callers do not override it. Because `main` contains the hero, the local About link changes the hash but stays at `scrollY = 0`; its intro remained below the hero. The Behind the Scenes caller has the same defect by inspection. Project routes already pass `project-intro` correctly.

The deployed About cue is still decorative text/SVG rather than a link. The homepage arrow is decorative in both versions. Give each hero an explicit destination after the hero and make the homepage cue a named link to selected work.

### A03 — Indefinite hero motion has no pause control · P1 · confirmed

The live homepage video is playing, loops, has no controls, and has a measured duration of **15.64 seconds**. The arrow also bounces indefinitely. Reduced-motion handling is already good, but visitors without that preference cannot pause the moving content. Add a keyboard-accessible pause/resume control or stop motion within five seconds; stop the arrow after a brief cue. [WCAG pause, stop, hide guidance](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html).

### A04 — Chapter labels fail normal-text contrast · P1 · calculated

The local homepage chapter label uses `text-base-100/45` on `bg-neutral`: foreground `#eff0f6` at 45% opacity over `#11131d`. Its effective contrast is approximately **4.12:1**, below 4.5:1 for normal-sized text. At 50% the same pair is approximately 4.80:1. Raise the chapter-label opacity or introduce a tested muted-text token. This finding concerns that solid background; it does not certify text rendered over photographs.

Social links in the mobile header have measured 20px heights; the Instagram target is 20 × 20px. Enlarge the hit areas to approximately 44px while retaining the icon size. This is a touch-usability recommendation; WCAG's 24px rule has spacing exceptions, so dimensions alone are not counted as a proven failure. [Target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

### A05 — Many image descriptions identify a sequence rather than the photo · P1 · confirmed

`behind-the-scenes.mdx` has **50 numbered alt strings** across A Long Goodbye and Bearer of Bad News, such as a film title followed by “behind the scenes (1).” These do not describe the image. The BTS hero alt is only “behind the scenes.” Homepage cards construct a generic authorship description rather than taking a curated description of their actual image.

Describe the scene for informative photographs. For a card where adjacent text already supplies the link's identity and the still is decorative, use empty alt deliberately. The current static content test rejects two old placeholder patterns but allows today's numbered wording. Strengthen the test after the descriptions are replaced.

### A06 — Structured data includes an unsupported credit and incomplete video metadata · P2 · confirmed

`BaseHead.astro` emits `cinematographer` on every Movie, but that property is absent from the current Movie/CreativeWork vocabulary. Use a supported `contributor` with an appropriate Role representation or readable `creditText`; validate role attribution rather than claiming authorship of every film. [Movie vocabulary](https://schema.org/Movie).

All four trailer objects omit `uploadDate`, which Google lists as required for VideoObject eligibility. Add verified first-publication dates to video records; do not infer them from a film year or manufacture a date. This affects search enhancements, not playback. [Google video metadata requirements](https://developers.google.com/search/docs/appearance/structured-data/video).

### A07 — Passing tests leave interaction and type errors uncovered · P1 · confirmed gap

The suite mostly checks data and HTML strings. There are no browser-test dependencies or interaction tests. For example, the no-script test only checks that the initial menu lacks `hidden`, and the lightbox test checks inline attribute strings rather than actually opening a modal. The About scroll defect passes all tests.

There is no `check` script, and `@astrojs/check` is absent. Most component props are inferred from untyped `Astro.props`; MDX pages pass a `synopsis` prop into `ProjectHero`, which never consumes it. Add explicit Props contracts and a separate type-check gate. Astro builds transpile TypeScript without type checking. [Astro TypeScript guidance](https://docs.astro.build/en/guides/typescript/).

### A08 — Work discovery requires a long linear scroll · P2 · measured/editorial

The homepage begins with a full-height identity animation, then eight full-height project cards. The complete index is **6,702px** down on the live desktop page and **9,032px** down on the local mobile page, more than ten 844px viewports. The local introductory/chapter copy adds context but increases that journey.

Keep the cinematic presentation while putting “All work” and “Contact” access near the opening identity/role. Add chapter jumps and a compact overview before the long sequence. With only 17 projects, simple role/format filters are optional; a full search system is not justified.

### A09 — Key project proof and contact actions appear after long galleries · P2 · confirmed/editorial

The project template places the featured award after stills and its contact CTA after stills, credits, festivals, awards, and specs. Some galleries have 36–39 photographs. Move the featured proof and a concise contact link beside the intro; retain detailed evidence and the lower CTA for visitors who continue reading. The local role labels and end-of-project CTA are useful changes already in progress.

### A10 — Gallery `sizes` overstates the rendered width · P1 · browser-confirmed

`ContentPicture.astro` declares `sizes="100vw"` unless `contained` is passed. The project grid calls it without a layout-aware value. At 1280px, the two-column A Long Goodbye images render at **554px**, yet the browser chooses **1440px** candidates. One measured example is **27,010 bytes** for 1440px versus **10,382 bytes** for its 768px variant, a 62% byte reduction for that image if the smaller candidate is suitable. Actual savings vary by image and device pixel ratio.

Pass sizes based on grid/wide/full layout, add smaller mobile candidates where useful, and keep larger candidates for the lightbox. Do the same for Polaroid: its sizes breakpoints do not match the 560px/1024px CSS column changes or the board's maximum width. [Astro responsive-image guidance](https://docs.astro.build/en/guides/images/).

### A11 — Per-photo dialogs add repeated markup and weak gallery navigation · P2 · confirmed/editorial

Every photo has its own dialog and another image element. BTS contains **81 dialogs and 163 image elements**; Vlinderman and Ever Since each contain **39 dialogs and 80 image elements**. Closed-dialog images are lazy, so these counts do not prove every full-size image downloads on initial load.

Use one reusable dialog per page, load its selected full-size image on opening, and add next/previous controls, an image counter, optional caption, and Left/Right keys. Preserve Escape, focus trapping, focus return, and scroll unlocking. Native dialog already supplies useful baseline behavior; keep it.

### A12 — Eager asset import makes builds process unrelated source material · P2 · confirmed

`resolveImage` eagerly imports the entire image tree, including unused source/selection folders. Source assets occupy approximately **753MB** on disk. The audit build generated **1,530 optimized-image jobs**, and the pruning step removed **441 unreferenced originals**, freeing approximately **410MB**. The final artifact is **69,071,519 bytes** (~65.9MiB).

Pruning substantially helps deployment size but happens after source import/emission. Replace the eager glob with on-demand loaders or an explicit content-derived manifest; ensure the BTS schema uses displayed photos rather than unrelated files. Keep pruning as a safety net until emitted-asset behavior is verified. These are build and artifact costs, not the amount downloaded by each visitor.

### A13 — Analytics behavior and privacy choices need explicit verification · P2 · source-confirmed gap

Production builds include the GA loader and a `gtag('config', id)` call through `astro-google-analytics`. The source has no consent-choice UI or explicit route page-view controller. That does not prove page views are broken: GA4 can track history changes through account settings, which were not inspected.

Verify exactly one page view on initial load and each Astro navigation, including back/forward. Define whether analytics should be opt-in, disabled, or handled another way, then implement that choice consistently. Avoid adding manual page views on top of automatic history measurement. Vimeo iframes load when near the viewport; a click-to-load facade can make that third-party connection an explicit visitor action, matching the existing lightweight YouTube approach. [GA4 SPA guidance](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications).

### A14 — Filmography metadata and presentation are inconsistent · P2 · confirmed/in need of editorial verification

**11 of 17 projects have no year**. The schema permits empty required text and arbitrary video IDs, and does not enforce unique positive integer ordering. The Bieke project card says “by Magnum Photos” while its intro/archive identifies Joppe Rog as director; the producer/director distinction should be labelled. The Moonlight Woman card still says “IN POST-PRODUCTION”; its current status needs confirmation, not an assumed rewrite.

All gallery caption/layout controls added locally are unused by the current project records. Most pages therefore retain the same two-column rhythm. Verify available years/statuses, distinguish director and producer, and curate a small set of strong opening images with captions where they add context. Preserve the complete galleries behind an optional expansion instead of deleting material.

### A15 — Social-image failures are silently converted into unverified URLs · P2 · source-confirmed risk

`BaseHead.astro` catches any `resolveImage`/optimization error and treats the original image string as a public URL. This is valid for the known public homepage image, but a typo in an asset path could silently produce a broken social card. No current broken local image reference was found.

Explicitly distinguish public images from managed assets and throw for invalid managed paths. Make metadata tests cover actual local image targets, including public fallbacks and poster/source attributes. Consolidate the site URL, social links, and contact identity instead of repeating them across templates.

### A16 — Scroll hiding can conceal active navigation · P2 · source-confirmed risk

The header's scroll handler hides the bar when scrolling downward even if its menu is open or focus remains inside navigation. `focusin` restores it only when focus changes. Guard against hiding an open menu or focused header, and close a disclosure cleanly when leaving the mobile breakpoint. This was identified in source; it was not reproduced as a user-visible failure during the audit.

### A17 — Rendering and font optimizations should follow measurements · P3 · hypotheses

Eight large homepage cards and all project heroes use grain SVG filters. BTS assigns `will-change: transform` to every Polaroid. These may increase paint/compositing work on less capable devices; no GPU trace was captured. Measure with grain disabled and remove permanent `will-change` if it does not help.

The shared CSS is **127,969 bytes raw / 20,119 bytes gzip**. Nine font faces are declared, with WOFF and WOFF2 assets emitted; unused declared fonts are not automatically downloaded. Inspect actual font requests before consolidating weights, changing preloads, or introducing variable fonts. Broad CSS/font rewrites are lower priority than A10.

### A18 — CI verifies deployment commits but does not check proposed changes · P2 · confirmed

The workflow triggers on `master` pushes and manual dispatch, with no pull-request verification job or deployment concurrency. It builds and tests correctly after a deployment-triggering commit, but contributors cannot rely on that workflow for pre-merge checks. Add a read-only PR validation workflow and deployment serialization; scope Pages write permissions to deployment.

The README describes fonts as downloaded at build time, whereas Fontsource packages supply them locally. Correct the documentation and distinguish generated-schema validation from actual component type checking.

## Already in progress locally

| Improvement | Live | Current local state |
| --- | --- | --- |
| Homepage H1 and professional introduction | No H1; role absent from main homepage content | Present |
| Role on selected cards and archive rows | Absent | Present |
| Thematic chapters | Absent | Present; requires contrast/discovery refinements |
| Clickable project hero scroll link | About is decorative; other live heroes not exhaustively sampled | Present; About/BTS destinations need correction |
| Project intro section heading | Absent from live About sample | Present |
| Per-image captions/layout controls | Not assessed on every live project | Schema/template supports them; content does not use them |
| Project contact CTA | Not assessed on every live project | Present near page end |

Do not treat these as new implementation work or overwrite them. The missing live homepage H1 is a production improvement pending release, not a remaining local-source defect. An H1 is useful for hierarchy; its absence alone is not presented as automatic WCAG failure.

## Complete project inventory

All these project routes build and are linked from the homepage archive. Counts refer to gallery photos, excluding the hero, award photo, and next-project preview.

| Slug | Recorded year | Gallery photos | Video provider |
| --- | --- | ---: | --- |
| a-long-goodbye | 2025 | 3 | — |
| anna | Missing | 6 | — |
| bearer-of-bad-news | 2026 | 36 | — |
| bieke-depoorter-chance-encounters | Missing | 15 | Vimeo |
| burn | 2023 | 31 | YouTube |
| burning-clouds | Missing | 12 | — |
| ever-since-i-have-been-flying | 2023 | 39 | YouTube |
| felix-le-gamin-qui-traverse | Missing | 8 | — |
| hoge-blekker | Missing | 8 | — |
| la-belle-rosine | Missing | 7 | — |
| les-homards-immortels | 2017 | 21 | Vimeo |
| moonlight-woman | Missing | 9 | — |
| springtide | Missing | 12 | — |
| the-tears-of-things | 2021 | 23 | — |
| today-we-escape | Missing | 12 | — |
| vlinderman | Missing | 39 | — |
| world-wood-web | Missing | 4 | — |

Homepage, About, Behind the Scenes, and 404 complete the 21-page inventory. The 404 is excluded from the sitemap and has noindex metadata locally. Production HTTP status behavior was not exhaustively checked.

## Performance baseline and future targets

These are measured artifact/browser facts, not Lighthouse scores:

| Measure | Baseline |
| --- | --- |
| Total generated artifact | 69,071,519 bytes |
| Homepage HTML | 70.8KiB raw / 10.5KiB gzip |
| BTS HTML | 164.9KiB raw / 16.8KiB gzip |
| Largest project HTML, Ever Since | 161.5KiB raw / 18.5KiB gzip |
| Shared CSS | 125.0KiB raw / 19.6KiB gzip |
| Local hero poster | 34,934 bytes |
| Hero WebM / MP4 | 1,060,306 / 629,799 bytes |
| Two-column gallery example | 554px rendered; 1440px candidate selected |

Record a reproducible lab baseline before optimization and compare like-for-like builds at fixed viewports and DPR. For field measurements, aim for LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 at the 75th percentile separately for mobile and desktop. Low traffic may leave field data unavailable; laboratory results do not establish field INP. [Web Vitals guidance](https://web.dev/articles/vitals).
