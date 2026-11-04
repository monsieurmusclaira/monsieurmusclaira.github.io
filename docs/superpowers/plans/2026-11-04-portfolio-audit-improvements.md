# Portfolio Audit Follow-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining UI, UX, performance, SEO, dependency and Astro-tooling gaps found in the 2026-11-04 audit of the portfolio, without changing its visual identity or its static GitHub Pages deployment.

**Architecture:** Static Astro 7 site (MDX + content collection `projects`, Tailwind 4 + daisyUI 5, `ClientRouter`, local Fonts API, Sharp image pipeline). Every task is a small, separately committable change guarded by the existing Vitest (`tests/*.test.ts`, run against `dist/`) and Playwright (`tests/browser/*.spec.ts`) suites. Measure before and after; adopt only what the measurement supports.

**Tech Stack:** Astro 7.4.x, @astrojs/mdx 8, @astrojs/sitemap, Tailwind 4.3, daisyUI 5, Zod 4, Vitest 5, Playwright 1.64, Node 22.23.4 (`.nvmrc`), ffmpeg + cwebp installed at `/usr/local/bin`.

**Spec:** This document is the spec. Prior work that must not be re-litigated: `docs/audits/2026-10-24-astro-implementation.md` (kept `ClientRouter`; kept WebP for cards/heroes; AVIF only for the About portrait; hover prefetch policy kept; Fonts API adopted; navigation custom element adopted; server/client islands rejected).

## Audit method and limits

This audit read the source (`src/`, `astro.config.mjs`, workflows, tests), the existing `dist/` build, `npm outdated`, and the 2026-10-24 evidence. **No Lighthouse/WebPageTest run, real-device test, or live-site crawl was performed**; findings marked *(verify)* are hypotheses that Task 0 must confirm or discard before work starts. Everything else was read directly from the files named.

## Global Constraints

- **Never `git push`** (any form) and never trigger deployment workflows. Commit locally only; report "ready for MrMochi to push".
- **No `Co-Authored-By` / AI attribution trailer in commit messages** (user's global rule; overrides tool defaults).
- Identity: do not write the owner's real name into Notion/GitHub/other shared surfaces; local files and the site's own content (which already uses the name) are unaffected.
- Node `>=22.23.4`; `package.json` and `package-lock.json` change together; verify with a clean `npm ci`.
- Keep static output (`output: 'static'`), the canonical host `https://victormaes.com`, trailing-slash URLs (`/about/`, `/projects/<slug>/`), and all 21 routes.
- Do not weaken or delete existing assertions to make tests pass; investigate failures.
- Preserve: dark-only theme, `#F1D74E` secondary, 44px minimum tap targets, `prefers-reduced-motion` handling, no-JS fallbacks (`html:not(.js)`).
- Gate for every task: `npm run check` (0 errors/warnings/hints) → `npm run build` → `npm run test:verify`; for UI tasks also `npm run test:browser` (Chromium desktop+mobile). Final task runs `npm run test:browser:all`.

## Review Focus

- Sitemap `lastmod` must reflect real content changes only; a build-time stamp on all URLs would be worse than none (existing comment in `astro.config.mjs:49-51`).
- Filter-URL sync must not break back/forward under `ClientRouter` or double-initialise after navigation.
- Grain replacement must look the same to the eye at 1280px and 390px; any visible change in film-card texture is a regression.
- Trimming daisyUI components must not remove a class used only by MDX content or by JS-created DOM (lightbox, filters).
- A re-encoded hero video must still start in Safari/iOS (MP4 fallback) and respect Save-Data / reduced-motion gating in `src/lib/hero-video.ts`.

---

## Findings summary (evidence → task)

| # | Area | Finding | Evidence | Task |
|---|------|---------|----------|------|
| F1 | Perf | Unexplained 1.6 MB WebP from the About portrait in `dist/_astro` (`IMG_2507-unblur.*_ZG3LNj.webp`), while the Picture delivers 320/640 AVIF+WebP. Likely a leaked default/full-size variant. | `find dist/_astro -size +400k`; `src/pages/about.mdx` | 1 |
| F2 | Perf/UX | `.grain` = SVG `feTurbulence` filter + `mix-blend-mode: overlay` on a full-viewport element, once per film card (8 on home). Filter rasterisation + blend are among the most expensive paints. *(verify with a trace)* | `src/styles/global.css:135-140`, `FilmCard.astro` | 2 |
| F3 | Perf | One 156 KB (23 KB gzip) render-blocking CSS file; daisyUI is loaded with all components though only navbar/menu/dropdown/btn/hero (plus a few) are used. | `dist/_astro/BaseLayout.*.css`, `global.css:4-7` | 3 |
| F4 | Perf | Hero loop is 1.06 MB WebM / 630 KB MP4 for an ~800 px-wide, 50dvh-capped element. *(verify bitrate/CRF headroom)* | `public/video/`, `VideoCard.astro` | 4 |
| F5 | SEO | Sitemap emits `changefreq`/`priority` (ignored by Google) and no `lastmod` (the one field Google uses). | `dist/sitemap-0.xml`, `astro.config.mjs:45-52` | 5 |
| F6 | SEO | `WebSite.name` is `"<Name> — Cinematographer & Director"`, which weakens Google's site-name signal; no `alternateName`. `Person` has no `image`/`email`. | `BaseHead.astro` (`websiteSchema`, `personSchema`) | 6 |
| F7 | SEO | `og:locale` is `en_BE`, not in Facebook's supported-locale list *(verify)*; `<meta name="title">`, `twitter:url`, and self-only `hreflang` + `x-default` on a single-language site are dead weight. | `BaseHead.astro` head block | 6 |
| F8 | SEO/A11y | Home film cards render `alt=""` because `FilmCard` is called without `alt`, although every project already has `hero.alt` text. Image search gets nothing for the most prominent images. | `index.astro`, `FilmCard.astro`, `burn.mdx` frontmatter | 7 |
| F9 | UX | Filmography filters (format/role) live only in memory: no shareable URL, lost on reload and on back-navigation. | `src/lib/work-filters.ts` (no `location`/`history` use) | 8 |
| F10 | UX | Lightbox supports arrow keys/Esc but has no touch swipe; on phones (the main browsing device) navigation between stills is by small buttons only. *(verify on device)* | `src/lib/lightbox.ts:71` | 9 |
| F11 | Tooling | Dependabot ignores all minor and major updates and has no `github-actions` ecosystem, so Astro minors and action bumps are never proposed. | `.github/dependabot.yml` | 10 |
| F12 | Deps | Patches available: astro 7.4.2→7.4.5, @astrojs/mdx 8.1.1→8.1.2, tailwindcss + @tailwindcss/vite 4.3.3→4.3.4, vitest 5.0.5→5.1.0. `npm outdated` "latest" for astro/mdx is *lower* than current, so dist-tags look stale — confirm with `npm view`. TypeScript 7 stays deferred until `@astrojs/check` supports it. Two moderate audit findings via `@tailwindcss/typography` remain upstream. | `npm outdated`, `docs/audits/2026-10-24-astro-implementation.md` | 10 |
| F13 | Tooling | `PORTFOLIO_ANALYTICS_DISABLED` / `ANALYTICS_ID` are read ad hoc (`import.meta.env`, `src/config.ts`) with no schema. Astro's typed `astro:env` is unused. | `Analytics.astro:2`, `config.ts` | 11 |
| F14 | Privacy/SEO trust | GA4 loads on every page with `analytics_storage: 'granted'` by default for a Belgian (EEA) audience. **Owner decision**, not an agent task: keep, switch default to `denied` + banner, or move to cookieless analytics. | `Analytics.astro:34-35` | Open questions |
| F15 | Repo | `.git` is 3.6 GB (≈750 MB originals in `src/assets`, plus ~150 tracked evidence PNGs under `docs/audits/evidence`). Slows clones and CI checkout. Fixing needs history rewrite (needs a push) → **owner decision**. | `du -sh .git src/assets` | Open questions |

Things checked and found healthy (do not touch): self-hosted fonts with 2 targeted preloads; canonical/OG/JSON-LD on all 21 routes; poster-only hero on phones/reduced-motion/Save-Data; click-to-load video embeds; skip link; semantic landmarks; `aria-current` on nav; 7.3:1 muted-text contrast; sensible `sizes` on the 81 BTS images; CI gating deploy on the full 3-engine matrix.

---

## Task 0: Baseline and verify hypotheses

**Files:**
- Create: `docs/audits/2026-11-04-baseline.md` (short results log)
- Create: `docs/audits/evidence/2026-11-04/` (JSON/log output only; **no new PNGs**, to avoid more repo bloat)

**Interfaces:**
- Produces: baseline numbers (CSS bytes raw/gzip, total `dist` size, largest 10 files in `dist/_astro`, Chromium trace paint time for `/` at 1280×720 and 390×844) that Tasks 1–4 cite as "before".

- [ ] **Step 1: Confirm clean tree and tooling**

Run: `git status --short && node -v && npm ci && npm run check && npm run build && npm run test:verify`
Expected: clean tree, Node `v22.23.4`, check 0 issues, tests pass.

- [ ] **Step 2: Record size baseline**

Run: `find dist/_astro -type f -size +300k -exec ls -l {} + | sort -k5 -nr | head -10; for f in dist/_astro/*.css; do echo $f $(wc -c <$f) $(gzip -c $f | wc -c); done; du -sh dist`
Write the output into `docs/audits/2026-11-04-baseline.md`.

- [ ] **Step 3: Identify the 1.6 MB About WebP (F1)**

Run: `grep -rl "ZG3LNj" dist --include=*.html`; then `grep -o '[^"]*ZG3LNj[^"]*' dist/about/index.html | head`.
Record which page/element references it, or that nothing references it (then it is an orphan and `scripts/prune-unused-assets.mjs` has a gap).

- [ ] **Step 4: Measure grain cost (F2)**

Use the browser tool (Chrome DevTools performance trace or `scripts/measure-rendering.mjs` as a template) on `npm run preview -- --host 127.0.0.1 --port 4323`, `/`, scrolling through the film cards at 1280×720, 6× CPU throttle. Record scripting/rendering/painting ms and any frames >50 ms. Repeat once with `.grain { display:none }` injected via devtools to isolate the filter's share.
Decision rule: proceed with Task 2 only if disabling grain reduces paint+raster time by ≥20% or removes long frames; otherwise mark Task 2 "rejected: no measurable gain" in the baseline doc and skip it.

- [ ] **Step 5: Verify F4, F7, F10**

- `ffprobe -v error -show_entries format=bit_rate:stream=codec_name,width,height,r_frame_rate,duration -of default=nw=1 public/video/seethrough-loop.webm` (and `.mp4`).
- Check Facebook's supported locales list for `en_BE` (context7 not applicable; use the Open Graph locale list from developers.facebook.com or the Sharing Debugger).
- Test the lightbox on the iOS Simulator or Chrome mobile emulation: can a user move to the next still by swiping?

- [ ] **Step 6: Commit**

```bash
git add docs/audits/2026-11-04-baseline.md docs/audits/evidence/2026-11-04
git commit -m "docs: record 2026-11-04 audit baseline"
```

---

## Task 1: Remove the stray 1.6 MB About image variant (F1)

**Files:**
- Modify: `src/pages/about.mdx` (Picture usage) and/or `src/utils/images.ts` / `scripts/prune-unused-assets.mjs`, depending on Task 0 Step 3
- Test: `tests/assets.test.ts`

**Interfaces:**
- Consumes: Task 0 Step 3 finding (referenced vs. orphan).

- [ ] **Step 1: Write the failing test** in `tests/assets.test.ts`: `it('ships no single image variant over 700 KB except the explicit allowlist')` — walk `dist/_astro/*.{webp,avif,jpeg,jpg,png}`, assert every file ≤ 716800 bytes, with an `ALLOWED_LARGE = []` constant the test names in its failure message.
- [ ] **Step 2: Run it to see it fail** — `npm run build && npx vitest run tests/assets.test.ts` → FAIL listing the 1.6 MB file (and note `IMG-20230813-WA0116`, `1.93.1_1.93.1`, `bearer-of-bad-news-bts-03` at ~400–500 KB; if the 700 KB ceiling is too tight for legitimate 2560 px stills, set the ceiling just above the largest legitimate file and say so in the test comment).
- [ ] **Step 3: Fix the cause.** If referenced: constrain the Picture/lightbox `widths` so no variant above 1440 px is produced for the About portrait. If orphan: extend `scripts/prune-unused-assets.mjs` to remove generated variants no HTML references (it already handles AVIF; add a fixture case mirroring the existing one).
- [ ] **Step 4: Verify** — `npm run build && npm run test:verify` → PASS; `du -sh dist` smaller than baseline.
- [ ] **Step 5: Commit** — `git commit -m "perf: stop shipping oversized About portrait variant"`

---

## Task 2: Replace per-card SVG grain with a cheap texture (F2) — *conditional on Task 0 Step 4*

**Files:**
- Modify: `src/styles/global.css:135-140` (`.grain`), `src/components/FilmCard.astro` (the `<svg class="grain">`), `src/layouts/BaseLayout.astro` (shared `#noiseFilter` svg, remove if unused)
- Create: `public/grain.webp` (≈256×256 tiling monochrome noise, <20 KB, generated once with ffmpeg/`cwebp` from an `feTurbulence` render so it matches the current look)
- Test: `tests/browser/pages.spec.ts`

**Interfaces:**
- Produces: `.grain` keeps its class name and `aria-hidden` contract; implementation changes to `background: url(/grain.webp) repeat; mix-blend-mode: overlay; opacity: .4` on a `div`/pseudo-element with `pointer-events:none`. Any other `.grain` consumers (`grep -rn "grain" src`) migrate in the same commit.

- [ ] **Step 1: Failing test** — Playwright test `film cards do not use an SVG filter for grain`: on `/`, assert `getComputedStyle(el,'::after' or el).filter === 'none'` for every `.grain`, and that `#noiseFilter` is absent from the DOM.
- [ ] **Step 2: Run** `npx playwright test tests/browser/pages.spec.ts -g grain --project=chromium-desktop` → FAIL.
- [ ] **Step 3: Implement** the tiled-image grain; capture one screenshot pair (before/after, 1280 and 390) into `/tmp`-style scratch only, compare by eye and with the Task 0 trace. If the texture is visibly different, tune `opacity`/tile size, do not ship a visible change.
- [ ] **Step 4: Verify** — full gate; paint/raster time ≤ Task 0 baseline.
- [ ] **Step 5: Commit** — `git commit -m "perf: use tiled grain texture instead of per-card SVG filter"`

---

## Task 3: Trim unused daisyUI components (F3)

**Files:**
- Modify: `src/styles/global.css:5-7` (`@plugin "daisyui"` options)
- Test: `tests/build.test.ts` (add CSS-size guard), existing browser a11y/interaction specs

**Interfaces:**
- Consumes: the list of daisyUI classes actually used. Produce it with `grep -rhoE 'class="[^"]*"' src | tr ' ' '\n' | grep -E '^(btn|navbar|menu|dropdown|hero|card|badge|divider|collapse|modal)' | sort -u`, then also check MDX and JS-created classes (`src/lib/*.ts`).

- [ ] **Step 1: Failing test** — in `tests/build.test.ts` assert the main CSS file is ≤ a ceiling equal to (Task 0 baseline gzip − 8 KB) and, separately, that the CSS still contains `.navbar`, `.menu`, `.dropdown-content`, `.btn-ghost`, `.btn-circle`, `.hero-content`.
- [ ] **Step 2: Run** `npm run build && npx vitest run tests/build.test.ts` → size assertion FAILS.
- [ ] **Step 3: Implement** `@plugin "daisyui" { themes: false; include: <comma list from the grep above>; }` (confirm the exact option name against the installed daisyUI 5 docs via context7 `resolve-library-id` "daisyui" before editing).
- [ ] **Step 4: Verify** — full gate including `npm run test:browser` (menu, hero, buttons render identically; compare `docs/audits/evidence/astro-implementation/final/*` screenshots by eye for home/about at both widths).
- [ ] **Step 5: Commit** — `git commit -m "perf: include only used daisyUI components"`

---

## Task 4: Re-encode the hero loop (F4)

**Files:**
- Modify: `public/video/seethrough-loop.webm`, `public/video/seethrough-loop.mp4`
- Test: `tests/hero-video.test.ts`

**Interfaces:**
- Consumes: Task 0 Step 5 `ffprobe` numbers. Keep dimensions, duration, loop point, audio-less. Source of truth is the existing files (no master available in repo).

- [ ] **Step 1: Failing test** — in `tests/hero-video.test.ts` assert `statSync('public/video/seethrough-loop.webm').size < 600_000` and `.mp4 < 450_000`; keep existing assertions on `<source>` order and `preload="none"`.
- [ ] **Step 2: Run** `npx vitest run tests/hero-video.test.ts` → FAIL.
- [ ] **Step 3: Encode** to scratch files first: VP9 `-c:v libvpx-vp9 -crf 36 -b:v 0 -an -row-mt 1`, H.264 `-c:v libx264 -crf 28 -preset slow -pix_fmt yuv420p -movflags +faststart -an`. Compare frames at 3 timestamps against the originals by eye (film grain/dark gradients band easily — raise quality if banding appears; if targets can't be met without visible banding, relax the thresholds in Step 1 and record why).
- [ ] **Step 4: Verify** — replace files, `npm run build && npm run test:verify && npx playwright test tests/browser --project=chromium-desktop -g "video|hero"`; confirm the MP4 plays in WebKit (`npm run test:browser:all -- -g hero`).
- [ ] **Step 5: Commit** — `git commit -m "perf: re-encode hero loop"`

---

## Task 5: Meaningful sitemap (F5)

**Files:**
- Modify: `astro.config.mjs:45-52`, `src/lib/project-schema.ts` (optional `updated` field), project `.mdx` frontmatter only where a real date is known
- Test: `tests/seo.test.ts`

**Interfaces:**
- Produces: `updated?: string` (ISO date, `z.string().date()` or the project's existing date style) on `projectSchema`; sitemap `serialize(item)` that sets `item.lastmod` to the project's `updated` for `/projects/<slug>/` URLs and to the newest `updated` for `/`; `/about/` and `/behind-the-scenes/` get none unless a date is given in their frontmatter. No build-time stamping.

- [ ] **Step 1: Failing tests** in `tests/seo.test.ts`: (a) sitemap contains no `<changefreq>` or `<priority>`; (b) every `<lastmod>` present is a valid past ISO date and, for a project URL, equals that project's `updated`; (c) no `<url>` for `/404`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** — drop `changefreq`/`priority`; add `serialize`. Backfill `updated` only from `git log -1 --format=%cs -- src/content/projects/<slug>.mdx` and say in the commit that dates are from git, not editorial judgement.
- [ ] **Step 4: Verify** — full verify gate; open `dist/sitemap-0.xml`.
- [ ] **Step 5: Commit** — `git commit -m "seo: sitemap lastmod from project dates, drop ignored fields"`

---

## Task 6: Structured data and head cleanup (F6, F7)

**Files:**
- Modify: `src/components/BaseHead.astro`, `src/config.ts` (add `SITE_ALTERNATE_NAME` if wanted), `tests/seo.test.ts`, `tests/fixtures/parity-baseline.json` (only entries that intentionally change, regenerated via `scripts/migration/parity-baseline.mjs`, reviewed line by line)

**Interfaces:**
- Produces: `WebSite.name === SITE_NAME`, `WebSite.alternateName === SITE_TITLE`; `Person.image` = absolute URL of the About portrait JPEG (already a registered social image) and `Person.email` omitted unless the owner opts in; head no longer contains `<meta name="title">`, `twitter:url`, or the redundant `hreflang` pair (keep `rel=canonical`); `og:locale` becomes `en_GB` if Task 0 Step 5 confirms `en_BE` is unsupported, else unchanged.

- [ ] **Step 1: Failing tests** in `tests/seo.test.ts` asserting each bullet above on `dist/index.html` and one project page; plus keep the existing Google-required `ProfilePage.mainEntity` assertions.
- [ ] **Step 2: Run** → FAIL on new assertions only.
- [ ] **Step 3: Implement** in `BaseHead.astro` (`websiteSchema`, `personSchema`, head markup).
- [ ] **Step 4: Verify** — verify gate; paste `dist/index.html` JSON-LD into Google's Rich Results Test / schema.org validator and record "no errors" or the warnings in the commit body.
- [ ] **Step 5: Commit** — `git commit -m "seo: correct WebSite name, enrich Person, trim dead head tags"`

---

## Task 7: Descriptive alt text on home film cards (F8)

**Files:**
- Modify: `src/pages/index.astro` (pass `alt`), `src/lib/projects.ts` / the `films` mapping to carry `hero.alt`, `src/components/FilmCard.astro`
- Test: `tests/content.test.ts` or `tests/browser/pages.spec.ts`

**Interfaces:**
- Consumes: `data.hero.alt` (string, already required by `projectSchema` — confirm in `src/lib/project-schema.ts`).
- Produces: `FilmCard` image `alt` = the project's `hero.alt`. Because the card's link already has an accessible name from its heading, set `aria-hidden` on nothing; accept the minor duplication (screen readers announce link name + image alt) *only if* a NVDA/VoiceOver pass in Step 4 finds it tolerable; otherwise keep `alt=""` and revert, recording the decision.

- [ ] **Step 1: Failing test** — on `/`, each `.featured-film img` has non-empty `alt` equal to its project's `hero.alt`.
- [ ] **Step 2: Run** `npx playwright test -g "film cards alt" --project=chromium-desktop` → FAIL.
- [ ] **Step 3: Implement** the pass-through.
- [ ] **Step 4: Verify** — verify gate + axe specs (`tests/browser/pages.spec.ts` already runs axe); spot-check with VoiceOver.
- [ ] **Step 5: Commit** — `git commit -m "a11y/seo: describe film card images"`

---

## Task 8: Shareable, restorable filmography filters (F9)

**Files:**
- Modify: `src/lib/work-filters.ts`, `src/pages/index.astro` (no markup change expected)
- Test: `tests/browser/discovery.spec.ts`

**Interfaces:**
- Produces: query params `?format=<value>&role=<value>` mirrored to/from the two `<select>`s. Use `history.replaceState` (not `pushState`, so filter tweaks don't pollute back stack) and read params on `astro:page-load` and `pageshow`. Unknown/invalid values are ignored (select falls back to "All"). Page stays fully static; with JS disabled the form remains hidden and the full list shows (unchanged).

- [ ] **Step 1: Failing tests** in `tests/browser/discovery.spec.ts`: (a) selecting a format updates `location.search`; (b) loading `/?format=Documentary` (use a real value from `formats`) shows only those items and the count text updates; (c) `/?format=bogus` shows all items; (d) navigate to a project and back → filter and count preserved; (e) "Clear filters" removes the params.
- [ ] **Step 2: Run** `npx playwright test tests/browser/discovery.spec.ts --project=chromium-desktop` → FAIL.
- [ ] **Step 3: Implement** in `work-filters.ts`, keeping its existing aria-live count/empty-state behaviour and guarding against double init (it already runs on page-load; do not add a second listener).
- [ ] **Step 4: Verify** — `npm run test:browser:all -- tests/browser/discovery.spec.ts`; confirm canonical stays `https://victormaes.com/` with no params (it is built from `Astro.url.pathname`, so it should).
- [ ] **Step 5: Commit** — `git commit -m "ux: persist filmography filters in the URL"`

---

## Task 9: Touch swipe in the lightbox (F10) — *conditional on Task 0 Step 5*

**Files:**
- Modify: `src/lib/lightbox.ts` (keyboard handling lives near line 71)
- Test: `tests/browser/gallery.spec.ts`

**Interfaces:**
- Produces: horizontal swipe (≥48 px, mostly horizontal, single pointer) calls the same next/previous functions the arrow keys use. Use Pointer Events on the dialog image area; `touch-action: pan-y` on that element so vertical scrolling/zoom are unaffected; ignore swipes when `prefers-reduced-motion` has no bearing (no animation added).

- [ ] **Step 1: Failing test** in `gallery.spec.ts` using Playwright `page.touchscreen`/dispatching pointer events: open the lightbox on the mobile project, swipe left → next image index; swipe right → previous; a 20 px nudge changes nothing; focus management tests still pass.
- [ ] **Step 2: Run** `npx playwright test tests/browser/gallery.spec.ts --project=chromium-mobile` → FAIL.
- [ ] **Step 3: Implement** the pointer handler with `AbortController` cleanup consistent with the existing module.
- [ ] **Step 4: Verify** — mobile + desktop Chromium, then WebKit (`--project=webkit-mobile` or equivalent listed in `playwright.config.ts`).
- [ ] **Step 5: Commit** — `git commit -m "ux: swipe between lightbox images on touch"`

---

## Task 10: Dependency refresh and automation (F11, F12)

**Files:**
- Modify: `package.json`, `package-lock.json`, `.github/dependabot.yml`

**Interfaces:**
- Consumes: output of `npm view astro version`, `npm view @astrojs/mdx version`, `npm view vitest version`, `npm view tailwindcss version` (authoritative; ignore `npm outdated`'s "Latest" column where lower than current).

- [ ] **Step 1: Inventory** — record `npm outdated`, `npm audit --omit=dev`, and `npm view` results in `docs/audits/2026-11-04-baseline.md` (append). Only stable releases; read the changelog of each bumped package.
- [ ] **Step 2: Update in two commits.** (a) Astro group: `npm install astro@<v> @astrojs/mdx@<v> @astrojs/sitemap@<v>`; run `npm run check && npm run build && npm run test:verify`. (b) Tooling group: `tailwindcss@4.3.4 @tailwindcss/vite@4.3.4 vitest@<v>`; run the same plus `npm run test:browser`.
- [ ] **Step 3: Clean install proof** — `rm -rf node_modules && npm ci && npm run check && npm test` → PASS.
- [ ] **Step 4: Dependabot** — keep `npm` weekly but allow `minor` for the group `astro` (`patterns: ["astro", "@astrojs/*"]`) and `patch+minor` for dev tooling; keep majors ignored; add `package-ecosystem: github-actions`, weekly, directory `/`. Keep "no auto-merge" comment.
- [ ] **Step 5: Commit** — two `chore(deps): …` commits and one `ci: widen dependabot` commit. Leave TypeScript 7 and Node-types 26 alone and say why in the commit body.

---

## Task 11: Typed environment with `astro:env` (F13)

**Files:**
- Modify: `astro.config.mjs` (`env.schema`), `src/components/Analytics.astro`, `src/config.ts` (`ANALYTICS_ID` may move to schema as a public client var), `tests/seo.test.ts`/analytics specs as needed

**Interfaces:**
- Produces: `env.schema.PORTFOLIO_ANALYTICS_DISABLED = envField.boolean({ context: 'client', access: 'public', default: false })`; `Analytics.astro` imports `PORTFOLIO_ANALYTICS_DISABLED` from `astro:env/client`. Confirm exact API names against the installed Astro 7 docs (context7 "astro" → env) before editing; if the `astro:env` shape differs, follow the docs, not this plan.

- [ ] **Step 1: Failing test** — a build with `PORTFOLIO_ANALYTICS_DISABLED=true` yields `data-production="false"`; a default build yields `"true"` (extend the existing analytics checks in `tests/browser/video-analytics.spec.ts` or `tests/build.test.ts`; both builds can run in a Vitest `beforeAll` with different env into separate `outDir`s, or assert against the config module).
- [ ] **Step 2: Run** → FAIL (schema absent).
- [ ] **Step 3: Implement.** Keep the localhost/host safeguards in `src/lib/analytics-policy.ts` untouched.
- [ ] **Step 4: Verify** — verify gate; `npm run test:browser` (analytics specs).
- [ ] **Step 5: Commit** — `git commit -m "chore: declare analytics env with astro:env"`

---

## Task 12: Final regression sweep

**Files:**
- Modify: `README.md` (only if commands or env docs changed), append results to `docs/audits/2026-11-04-baseline.md`

- [ ] **Step 1:** `npm ci && npm run check && npm test && npm run test:browser:all` → all green on Chromium/Firefox/WebKit, desktop and mobile.
- [ ] **Step 2:** Repeat Task 0 Step 2 and Step 4 measurements; append a before/after table (CSS bytes, `dist` size, largest files, paint time, hero video bytes). State which tasks were rejected and why.
- [ ] **Step 3:** In the Astro dev toolbar (`npm run dev`, Audit app) open `/`, `/about/`, one project and `/behind-the-scenes/`; record any new a11y/perf audit warnings.
- [ ] **Step 4: Commit** — `git commit -m "docs: record audit follow-up results"` — then **stop and report "commits ready; pushing is MrMochi-only."**

---

## Open questions for the owner (not agent work)

1. **Analytics consent (F14):** keep GA4 with consent defaulted to granted, default to denied with a minimal banner, or move to a cookieless tool? This affects legal posture for EEA visitors and is outside a purely technical fix.
2. **Repo weight (F15):** 3.6 GB `.git`. Options: move originals to external storage/Git LFS and rewrite history (needs a push, so MrMochi-only), or stop tracking `docs/audits/evidence/**/*.png`. No agent action until chosen.
3. **Showreel / contact prominence:** the home hero is a silent loop with no explicit "watch reel" or "contact" call to action; contact is only a nav link and the footer. A content/design call: add a reel link and/or hero CTA?
4. **Hosting headers:** GitHub Pages cannot set long-lived cache headers or a real CSP. If caching/security headers matter, a Cloudflare layer would give them; out of scope here.
5. **Astro CSP (`security.csp`)** was not evaluated; with GA4 and inline scripts it is a larger change. Say if you want it scoped as its own plan.

## Self-review notes

- Spec coverage: UI (T2, T3, T7), UX (T8, T9), performance (T1–T4), SEO (T5–T7), updates (T10), Astro tooling (T10 Dependabot, T11 `astro:env`, T5 sitemap `serialize`, T12 dev toolbar). Each audit bullet has at least one task or an explicit "checked, healthy / rejected earlier" entry.
- Tasks 2 and 9 are conditional on measurements in Task 0 by design; Task 3's option name and Task 11's API names must be confirmed against current docs before edits.
- Order: Task 0 first; Tasks 1–11 are independent of each other (each touches different files) except Task 10 should land before Task 11 and Task 12 is last. Tasks 5/6 both touch `tests/seo.test.ts`, so run them sequentially.
