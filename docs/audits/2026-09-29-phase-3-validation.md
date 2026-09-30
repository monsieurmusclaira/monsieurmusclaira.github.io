# Phase 3 validation — 29 September 2026

Prepared for MrMochi. Phase 3 is implemented locally. Phases 4–5 remain planned; remote publication is MrMochi-only.

## Delivered

- Gallery image sizes now follow the real grid, wide, full, and one/two/three-column Polaroid layouts. Smaller candidates cover phones and standard-resolution desktops while full-size views retain the previous 2560px project / 1200px BTS targets.
- One native dialog per page replaces individual image dialogs. It includes Previous, Next, Close, a position counter, captions, arrow keys, keyboard focus wrapping, Escape/backdrop closing, and restoration to the opening trigger. Repeated image paths receive separate trigger IDs. Captions use `textContent`.
- The dialog image has no source until opened. Optimized full-size image links work without JavaScript. Gallery links bypass Astro routing and prefetching so opening a modal cannot navigate to the image or download it early.
- A generated manifest includes 389 referenced source images, with lazy imports and memoized resolutions. BTS structured data follows photos on the visible board. Missing references and nonliteral BTS image paths produce explicit errors. Unused source originals are no longer emitted; pruning remains enabled.
- Asset integrity checks now also cover posters, deferred image sources, CSS font/image URLs, and full-size image links. Existing social/structured-data checks remain in place.
- Permanent Polaroid `will-change` was removed after the rendering experiment. Grain, hover rotations, font weights, and preloads are retained.
- The removed animation toggle, homepage introductory section, and chapter separators remain removed.

## Image transfer

Fresh Chromium contexts visited each route with external requests blocked and reduced motion enabled, then scrolled in 600px steps with the same timing. The figures sum downloaded image response bodies, including the hero and adjacent-project images. They exclude headers, fonts, scripts, and full-size modal images, since dialogs were never opened. This is a fixed lab comparison, not a field performance claim.

| Page | Viewport / DPR | Before bytes | After bytes | Reduction |
| --- | --- | ---: | ---: | ---: |
| Chance Encounters, 14 stills | 1280×720 / 1 | 313,578 | 139,196 | 55.6% |
| Ever Since I Have Been Flying, 39 stills | 1280×720 / 1 | 1,839,206 | 661,096 | 64.1% |
| BTS, 81 photos | 1280×720 / 1 | 1,860,004 | 1,324,494 | 28.8% |
| Chance Encounters | 1280×720 / 2 | 672,200 | 333,028 | 50.5% |
| Ever Since I Have Been Flying | 1280×720 / 2 | 3,561,666 | 1,600,462 | 55.1% |
| BTS | 1280×720 / 2 | 5,494,094 | 3,897,420 | 29.1% |
| Chance Encounters | 390×844 / 2 | 216,754 | 154,404 | 28.8% |
| Ever Since I Have Been Flying | 390×844 / 2 | 1,255,278 | 848,862 | 32.4% |
| BTS | 390×844 / 2 | 5,494,094 | 3,897,420 | 29.1% |

The 554px desktop grid slot selected 1440px / 2560px candidates before; it now selects 576px / 1152px at DPR 1 / 2. These selections pass in Chromium, Firefox, and WebKit. Project measurements contain one additional thumbnail request; total transferred bytes still fall as shown. All nine scenarios requested seven font files, so no font changes were made.

Raw measurements: [before](phase-3-measurements/gallery-before.json), [after](phase-3-measurements/gallery-after.json). Reproduce with `scripts/measure-gallery.mjs` against the relevant production preview.

## Build and output

Both builds used Node 22.23.3, the locked dependency versions, empty output directories, and separate fresh image caches. Times cover programmatic Astro builds; pruning was measured separately. These are single cold runs on this machine, so the difference is indicative rather than a statistical benchmark. Later warm builds were used for final verification, not the speed comparison.

| Measure | Before | After |
| --- | ---: | ---: |
| Cold build wall time | 33.01 seconds | 29.09 seconds |
| Pages | 21 | 21 |
| Optimized image variants | 1,530 | 1,861 |
| Unused originals removed by pruning | 441 | 0 |
| Pruned artifact files | 1,600 | 1,931 |
| Pruned artifact bytes | 68,972,586 | 64,448,806 |
| Pruned artifact size | 65.78 MiB | 61.46 MiB |

Cold build time fell 11.9%; the final pruned output is 6.6% smaller. Additional small responsive candidates increase file count while reducing total size. The old unpruned build was 498,584,276 bytes; comparison against that alone would exaggerate the shipping-size improvement, since the old build already pruned unused originals.

Raw build/output counts: [build.json](phase-3-measurements/build.json).

## Rendering experiment

Chromium sampled a 390×844 / DPR 2 viewport with normal motion, 6× CPU throttling, preloaded content, and 120 animation frames of scrolling. Each baseline/override combination ran three times. The table reports medians; it measures paint duration and content-layer count rather than physical-device frame rate.

| Experiment | Baseline layers → override layers | Baseline paint → override paint |
| --- | --- | --- |
| Hide homepage grain | 18 → 11 | 9.571ms → 11.422ms |
| Remove permanent Polaroid promotion | 41 → 4 | 19.369ms → 12.772ms |

No run recorded a frame over 50ms. Removing permanent Polaroid promotion reduced layers and sampled paint work, so it was applied. Hiding grain showed no clear paint benefit, so grain stays. A short throttled desktop-browser trace does not replace actual mobile testing.

Raw runs: [rendering.json](phase-3-measurements/rendering.json). The override comparison must run against a build still containing the baseline effect. The script uses Chromium's [CPU throttling](https://chromedevtools.github.io/devtools-protocol/tot/Emulation/#method-setCPUThrottlingRate) and [tracing](https://chromedevtools.github.io/devtools-protocol/tot/Tracing/) APIs.

## Verification

- Clean locked install on Node 22.23.3 with npm 11.20.0: successful; dependency audit reported zero vulnerabilities.
- Astro/TypeScript check: zero errors, warnings, or hints (61 files in the validation checkout; 62 in the original workspace).
- Production output: all 21 pages generated; pruning removed zero unused originals.
- Vitest: 162 tests passed across 10 files, including generated-manifest behavior and asset integrity after pruning.
- Playwright: 162 checks passed across desktop/mobile Chromium, Firefox, and WebKit. Includes navigation/history, 320px/768px overflow, reduced motion, no JavaScript, modal axe scans, lazy full-size downloads, responsive candidate selection, focus/keyboard controls, captions treated as plain text, and native full-size photo navigation without JavaScript.
- Visual inspection: gallery controls and image fit checked at 390×844 and 1280×720.
- `git diff --check`: successful.

After installing the verified artifact, type checking and all 162 Vitest tests also passed in the original workspace. The existing port-4321 preview returned HTTP 200 with one dialog, 81 BTS triggers, and the new sequence controls. All 82 source/test/config files compared between checkouts were identical.

The browser suite initially exposed Astro intercepting photo links; the explicit routing/prefetch attributes fixed it. Firefox/WebKit also exposed a test race that called `decode()` before native lazy-image selection started; candidate checks now wait for a completed image request.

## Local environment limitation

macOS began denying reads of some existing BTS JPEGs with `EPERM`, including `bearer-of-bad-news-bts-05.jpeg`. The files are tracked and unchanged. Read attempts also failed outside the command sandbox. Source photo permissions and content were left unchanged.

To validate the implementation, a temporary checkout used the exact current code and an independent locked dependency install, with unchanged source images extracted read-only from Git. The final production artifact from that checkout supplies the existing preview on port 4321. Type checking and tests can use this verified artifact, but a fresh build in the original checkout still requires restoring macOS access to those source photos.

No physical iPhone/Android run, field Web Vitals measurement, push, or deployment was performed.

Update, 30 September 2026: the previously blocked JPEG is readable and the full Phase 4 production build succeeds in the original workspace. The existing preview now serves that build; the temporary-checkout workaround is no longer needed. See the [Phase 4 record](2026-09-30-phase-4-validation.md).
