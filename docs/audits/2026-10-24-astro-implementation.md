# Astro and dependency implementation results

Date: 24 October 2026. Local implementation; no publication.

## Reproduction and baseline

Use Node from `.nvmrc`, `npm ci`, `npm run check`, `npm run build`, and
`npm run test:verify`. Install matching browsers with
`npx --no-install playwright install chromium firefox webkit`, then run
`npm run test:browser:all`. `PORTFOLIO_TEST_PORT` selects a free test port
(default 4322); this run used 4324 because 4322 was already occupied.

For measurements, start `npm run preview -- --host 127.0.0.1 --port 4323`,
then `node scripts/measure-astro.mjs <output-directory>`. The script rejects
remote preview hosts and blocks third parties. It records three fresh-context
loads for four routes at 1280×720 and 390×844, both at DPR 2, screenshots,
font faces, selected image candidates, response bodies, and hover/warm navigation
requests. Gzip/Brotli values are calculated from bodies; the preview itself
does not simulate GitHub Pages compression. Navigation caching is affected by
Playwright request interception. Timings are unthrottled local lab observations,
not field Core Web Vitals. Long-task blocking is a lab responsiveness proxy,
not INP. The fixed 1.5-second observation window is a bounded comparison,
not a whole-session CLS measurement.

Evidence lives in `evidence/astro-implementation/`. The baseline used Node
22.23.1, Astro 7.3.5 and Playwright 1.63.0. Upgraded runs use Node 22.23.4
and Playwright 1.64.1. `PORTFOLIO_CHROMIUM_PATH` retains Chromium
153.0.8010.12 for the application comparisons, despite the tooling upgrade;
release verification uses the new matching browser binaries.

The original baseline passed Astro check, 197 verification tests and 82
Chromium desktop/mobile tests. All 21 generated routes retain identical
titles, descriptions, canonical URLs, Open Graph data and JSON-LD after the
dependency upgrade (`metadata-comparison.json`).

## Dependency decisions

| Direct package/tool | Before | Selected | Reason |
| --- | --- | --- | --- |
| Astro | 7.3.5 | 7.4.2 | Current stable; includes updated build dependencies |
| MDX | 7.0.8 | 8.1.1 | Delegates MDX processing to Astro's Markdown processor |
| Astro Check | 0.9.10 | 0.9.12 | Current compatible checker |
| Sitemap | 3.7.4 | 3.7.4 | Already current |
| markdown-remark | 7.3.1 | Removed direct dependency | No direct imports or explicit unified processor configuration; MDX 8 uses Astro's default Satteri processor |
| Fontsource Caveat / EB Garamond | 5.3.0 | 5.3.0 | Already current |
| Fontsource Montserrat | 5.3.0 | See fonts decision below | Separate feature experiment |
| Tailwind / Vite plugin | 4.3.3 | 4.3.3 | Already current |
| Tailwind typography | 0.5.20 | 0.5.20 | Already current; advisory constraint below |
| DaisyUI | 5.7.46 | 5.7.50 | Compatible patch |
| Zod | 4.6.5 | 4.6.7 | Fixes constrained-collection memory advisory |
| TypeScript | 6.0.3 | 6.0.3 | Defer 7.0.2 until Astro Check's peer range supports TypeScript 7 |
| Node types | 22.20.4 | 22.20.5 | Match selected Node major; do not use Node 26 declarations on Node 22 |
| Vitest | 4.1.11 | 5.0.5 | Current stable; Vite 8 and Node 22 supported; existing mocks pass without config relaxation |
| Playwright | 1.63.0 | 1.64.1 | Current stable; matching browser binaries installed |
| axe Playwright | 4.13.0 | 4.14.0 | Compatible update |
| YAML | 2.9.1 | 2.9.1 | Already current |
| Node pin / minimum engine | 22.23.3 / ≥22.12.0 | 22.23.4 / ≥22.23.4 | Satisfies Astro and MDX's updated minimum; local runtime installed temporarily without modifying global Node |
| checkout | v6 | v7 | Reviewed ESM action update |
| setup-node | v5 | v7 | Existing explicit npm cache and node-version-file inputs retained; no registry auth configured |
| upload-artifact | v4 | v7 | Current action; named diagnostics artifact and retention retained |
| upload-pages-artifact | v4 | v5 | Current Pages packaging action |
| deploy-pages | v5 | v5 | Already follows current v5 line |

Workflow permissions, triggers, release verification and deploy dependency gate
are preserved. No workflow was dispatched. Hosted `ubuntu-latest` supplies the
new action runtime; local tests cannot execute GitHub's hosted artifact service.

The initial npm audit reported 10 affected packages (5 high, 5 moderate).
The upgraded audit reports 2 moderate packages: typography and its pinned
`postcss-selector-parser` 6.0.10. The advisory affects pathological selector
parsing; this project processes checked-in styles at build time and serves
static files. No untrusted runtime selector processing is introduced. The
upstream typography package pins parser 6.0.10; npm proposes downgrading
typography to 0.5.4. That is not an acceptable compatibility fix. Revisit when
typography ships a patched supported parser. No forced audit fixes or
unreviewed transitive major overrides were applied. Advisory absence would
not establish general security.

The clean upgraded `npm ci` succeeded. npm initially hit an Arborist `edgesOut`
error during an incremental install; a clean install resolved the installed
tree and the reviewed updates then installed normally.

## Font decision: adopted

The local Fonts API now owns family declarations, optimized serif/sans fallback
metrics and the two critical preloads. The existing `--font-montserrat`,
`--font-eb-garamond` and `--font-caveat` contracts remain intact. The handwritten
font is not preloaded. The serif preload filters to 400 normal; it does not
download every weight or italic face. There are no runtime third-party font
requests or build-time font-provider downloads.

Montserrat uses the 37,956-byte Fontsource variable Latin file, constrained to
the original 300–600 range. EB Garamond remains static: its variable normal
file is 44,336 bytes versus the 23,820-byte home-page normal face, and its
variable italic is 47,940 versus 25,388 bytes for the required static italic.
Caveat's variable file is 74,932 versus 48,836 bytes for the sole required
static weight. Those two families would not benefit from a blanket variable
font migration. Only the unused static Montserrat dependency was removed.

| Route | Upgraded static font bytes | Adopted font bytes | Saving |
| --- | ---: | ---: | ---: |
| Home | 105,384 | 87,164 | 18,220 (17.3%) |
| About | 149,480 | 112,512 | 36,968 (24.7%) |
| Representative project | 149,480 | 112,512 | 36,968 (24.7%) |
| BTS | 172,928 | 135,960 | 36,968 (21.4%) |

Both measured viewport sizes requested the same faces. Font data is already
WOFF2-compressed; the table records response-body bytes. Font CSS moves partly
into the document head, so external stylesheet savings alone do not describe
the total CSS cost. Raw documents and calculated compression are recorded.

| Route | Upgraded mobile median LCP / CLS | Fonts mobile median LCP / CLS |
| --- | --- | --- |
| Home | 44 ms / 0.0002 | 44 ms / 0.0000 |
| About | 48 ms / 0.0009 | 52 ms / 0.0002 |
| Representative project | 60 ms / 0.0016 | 76 ms / 0.0000 |
| BTS | 60 ms / 0.0324 | 72 ms / 0.0006 |

These very small local LCP values are not evidence of a real-world speed
improvement or regression; host scheduling dominates differences of this size.
The useful outcomes are fewer font bytes and improved fallback stability.
All sampled long-task blocking medians were zero. Hero screenshot comparisons
showed fewer than 0.013% of channels differing by more than 10/255 in the
initial comparison, consistent with small variable-font rasterization changes,
without shifted layout or changed typography. Browser tests load accented
French/Dutch text, verify local requests and detect duplicate downloads across
client navigation.

## Image decision: selective Picture adoption

`compare-image-formats.mjs` records three encoder runs per sample/width at
WebP quality 68 and AVIF quality 50 using Astro's installed Sharp. The sample
covers dark footage, film grain, daylight detail and a portrait. Crops of both
formats are retained for inspection. At 2560px, AVIF was 28% larger for the
dark sample and 17% larger for grain, while encoder time increased severalfold.
It was only 6% smaller for detailed daylight. Shared film cards, heroes,
next-project images and galleries therefore keep their WebP output.

The About portrait is the bounded exception. Its actual delivery candidates
are 320 and 640 pixels: 3,962 → 3,474 bytes and 10,398 → 8,749 bytes respectively
(12.3% and 15.9% smaller). The additional AVIF encodes take approximately
0.09/0.18 seconds in the sample, versus approximately 0.05/0.08 seconds for
WebP. This small build cost is confined to one photo. `Picture` supplies an
AVIF source and the existing WebP fallback, preserving widths, sizes, loading
priority and intrinsic dimensions. Social cards remain JPEG.

The wrapper keeps the same 342px mobile and 300px desktop portrait width;
recorded bounding boxes match before and after. Source/fallback selection is
covered in all release browsers, including an explicit unsupported-source
simulation. The manifest still discovers the original JPEG; asset verification
checks every generated source candidate. The pruner now handles AVIF and has a
fixture proving referenced candidates survive while orphan variants are removed.
The layout probe waits for `image.decode()` and separately records bitmap
creation time; it does not isolate cold decoder CPU time. Successful decoding,
framing and fallback behavior were verified, without claiming a decode-speed gain.

The `layout="full-width"` hero trial retained exact tested geometry and
`sizes="100vw"`, but changed transform URLs and still needed the explicit
candidate widths and full-height cover classes. It offers no useful
simplification for these full-height cropped heroes. The trial was reverted;
irregular gallery and scrapbook sizes remain explicit. Trial build time was
7.42 seconds with cached existing transforms and newly generated image variants;
that is not comparable to a completely cold build.

## Navigation decision: retain ClientRouter

`prototype-native-navigation.mjs` copies sources to a new temporary directory,
uses the shared lockfile-installed dependencies and read-only source image
symlink, removes ClientRouter, adds native transition names/CSS and adapts
startup/cleanup events. It never changes the production routing mode. The
isolated build generated all 21 routes. `compare-navigation.mjs` exercised both
architectures in Chromium, Firefox and WebKit, in normal/reduced motion:
film-card navigation, gallery focus restoration, back-scroll behavior, mobile
menu after history navigation, and canonical-host analytics with a mocked tag.

Both remained usable in the tested flows. ClientRouter retained the document
and fetched the analytics tag once for two pages; native navigation replaced
the document and fetched it twice in every engine. Each native document had
one page-view event, so the prototype did not duplicate views within a document.
Both architectures showed up to 100px variation in the normal-motion WebKit
back-scroll exercise (the hovered card's transform also affects its position).
Normal-motion WebKit native history navigation also attached home video sources
while the restored position was below the hero, requiring further lifecycle
work. Document-load and BFCache lifecycle handling does not disappear when
removing the router. The prototype is retained as a bounded experiment, not a
second supported application mode or a claim of exhaustive native/BFCache parity.

The measured navigation durations include deliberate 500ms settling waits and
automation overhead. They are behavior diagnostics, not meaningful transition
latency benchmarks. The prototype did not demonstrate enough simplification
or transfer benefit to justify replacing the existing shared transitions,
router-managed history and persistent analytics element. Production retains
one routing architecture and its existing unsupported-transition fallback.

## Prefetch decision: retain measured hover policy

The existing policy generated no idle document prefetches. Hovering About
requested one document; hovering a film card requested that film's document.
A project-only opt-in prototype removed the About request but did not reduce
card costs, sacrificing prewarming of an actual navigation destination. The
existing hover debounce and URL deduplication already bound speculative work.
Neither policy requested hover destinations with simulated Save-Data/2g. The
gallery links retained `data-astro-prefetch="false"` and hovering a gallery
trigger caused no speculative full-image fetch. No viewport/archive-wide
prefetching was added. Raw requests and browser prefetch hints are in
`prefetch.json`; the script counts both link-prefetch and fetch fallback paths.

## Component lifecycle decision: adopt navigation custom element

`site-navigation` owns one semantic header's disclosure, focus, responsive
breakpoints and scroll behavior. Its connected callback attaches listeners
with one AbortController; disconnect aborts them and cancels the pending
animation frame. Guarded registration and connection prevent duplication.
This replaces the inline global controller, repeated remove-before-add
listeners and Astro page-load setup. The wrapper uses `display: contents`;
header/nav/button/link semantics and no-JS navigation remain available.
Tests repeatedly detach/reconnect the element and navigate away/back, checking
one-toggle behavior, Escape focus restoration and reset state. Existing
breakpoint and normal/reduced-motion tests remain unchanged.

The first final comparison detected a mobile header shift (CLS about
0.008–0.011): while the new module loaded, the old no-JS fallback briefly
rendered as an expanded list. That intermediate result is retained in
`final-before-header-fix/`. The fallback CSS is now scoped to `html:not(.js)`;
the existing early head script selects stable enhanced geometry before paint.
A browser test holds enhancement modules pending, compares header positions
before/after release, then verifies the disclosure still works. It passes in
all six configurations, alongside the existing JavaScript-disabled checks.

The upgraded Chromium suite also exposed a queued lightbox `close` focus race:
native restoration could complete before the custom handler, then the delayed
handler stole focus from the gallery summary. The opener is now focused before
showModal (also consistent in Safari), and queued close handling respects later
focus choices and already-reopened dialogs. A regression test deliberately
moves focus before the queued event. Closed gallery content also has an
explicit display rule, avoiding retained layout boxes. No test assertions
were weakened.

## Scope and validation notes

No framework islands, server islands, server actions, hosting changes, visual
redesign, content edits or historical audit backlog were introduced. Static
GitHub Pages output and production analytics policy remain intact. Production
analytics cost was not measured against Google's live service; only mocked
dispatch and tag-load counts were measured.

The first dependency browser matrix recorded 245 passes and one Chromium
gallery failure; an isolated retest reproduced it. A later matrix recorded
257 passes and the remaining mobile race. These failures were investigated
instead of hidden by retries or updated expectations. After the focus fix,
all 36 targeted Chromium discovery/interaction/Picture tests passed.

The final build contains 21 pages, 1,929 files and 64,212,655 bytes, versus
1,939 files and 64,541,515 bytes for the dependency-only build. It adds two
portrait AVIF variants and reduces WOFF2 output from nine files to six (and
removes the superseded Fontsource WOFF fallbacks). The final clean-install
build took 41.33 seconds including regenerating image cache entries; the
preceding warm build took 1.81 seconds. Cache state makes those different
measurements, not a 23× application performance regression. The final metadata
comparison again found zero differences on all 21 routes.

Six ordered review patches in `evidence/astro-implementation/review/` separate
dependency updates, fonts, images, the isolated native prototype, lifecycle/
prefetch work and measurement tooling. They were applied sequentially to
temporary copies of the starting sources and matched the final application
files. The dependency-only package/lockfile pair has a successful npm ci
dry-run; the final pair has a successful actual clean install. Application
changes remain local and uncommitted, ready for owner review. Git pushes,
equivalent remote code publication and deployment were not performed.

The final repeated three-run comparison (original Chromium binary) recorded
mobile median LCP/CLS of 36ms/0 for home, 44ms/0.00023 for About,
48ms/0 for the project and 44ms/0.00059 for BTS. Desktop medians were
40/36/44/56ms LCP respectively, with CLS 0–0.00027. No sampled median
long-task blocking was recorded. These remain local lab measurements with
the limitations above, not field-performance claims. `comparison.json`
collects per-phase medians and compressed/body resource categories; the raw
24 runs per phase and screenshots remain available.

Final gates: clean `npm ci` under Node 22.23.4; Astro check with zero errors,
warnings or hints; production build; 198 verification tests across 13 files;
and **288 browser tests passing across all six Chromium/Firefox/WebKit
desktop/mobile projects**. The full matrix includes delayed enhancement-script
loading, unsupported-transition fallback, AVIF and WebP selection, repeated
custom-element reconnection, no-JS behavior, accessibility, history, hash links
and mocked analytics dispatch. The final warm build took 4.28 seconds. The
audit remains at two documented moderate upstream findings, with no high or
critical advisories reported.

## Upstream references checked during implementation

- [Astro 7.4.2 release](https://github.com/withastro/astro/releases/tag/astro%407.4.2)
- [Astro v7 migration guide](https://docs.astro.build/en/guides/upgrade-to/v7/)
- [MDX changelog and v8 migration](https://github.com/withastro/astro/blob/main/packages/integrations/mdx/CHANGELOG.md)
- [Vitest 5 migration](https://vitest.dev/guide/migration/)
- [Playwright releases](https://playwright.dev/docs/release-notes)
- [Fonts API](https://docs.astro.build/en/guides/fonts/)
- [Images and Picture](https://docs.astro.build/en/guides/images/)
- [Native transitions versus ClientRouter](https://docs.astro.build/en/guides/view-transitions/)
- [Prefetch behavior](https://docs.astro.build/en/guides/prefetch/)
- [setup-node releases](https://github.com/actions/setup-node/releases)
- [checkout releases](https://github.com/actions/checkout/releases)
- [artifact releases](https://github.com/actions/upload-artifact/releases)
- [Pages artifact releases](https://github.com/actions/upload-pages-artifact/releases)
- [Remaining parser advisory](https://github.com/advisories/GHSA-rj75-hqrm-r3gf)
