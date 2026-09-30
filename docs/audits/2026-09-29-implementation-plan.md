# Portfolio implementation plan — 29 September 2026

Prepared for MrMochi. Evidence and finding IDs are in [the audit](2026-09-29-portfolio-audit.md).

## Intended result

Visitors should understand the professional role from the opening screen, reach the complete work list or contact in one action, inspect strong project images without unnecessary downloads, and navigate with a keyboard or touch device. The build should use patched dependencies and catch meaningful regressions before release.

Preserve the existing dark cinematic identity, film imagery, serif/sans typography, scrapbook page, static Astro hosting, and all project URLs. Start from the current local changes; six files already contain useful editorial work. This plan adds no implementation changes itself.

No framework migration, CMS, blog, paid service, or full-text search is required for these outcomes. Changes are split into reviewable batches. Estimates are focused engineering effort for one developer, exclude waiting for editorial information, and are not calendar commitments.

Execution status, 30 September 2026: **Phases 1–3, Phase 4's UI/UX implementation, and Phase 5's implementation are complete locally**. See the [Phase 1 record](2026-09-29-phase-1-validation.md), [Phase 2 record](2026-09-29-phase-2-validation.md), [Phase 3 record](2026-09-29-phase-3-validation.md), [Phase 4 record](2026-09-30-phase-4-validation.md), and [Phase 5 record](2026-09-30-phase-5-validation.md). Original-folder builds succeed. Phase 4's editorial confirmations remain pending. Phase 5 passes automated checks; GA4 history-setting confirmation, physical-device checks, caption follow-up, and live verification after owner publication remain release tasks.

Design decisions from the subsequent review: remove the hero Pause/Play control, the introductory section below the hero, and all chapter separators. Keep a direct hero-to-project flow. These decisions supersede the related presentation proposals below and apply to later phases.

Phase 4 review decisions: remove the added hero action buttons and contact buttons above the stills. Keep the award photograph visible without a toggle and label the synopsis “Synopsis.” Keep only Discuss a project in the closing contact section, and use the confirmed portfolio email. The website must not include the unrelated pseudonym or its associated email domain. These decisions supersede conflicting Phase 4 presentation proposals below.

## Delivery order

| Phase | Deliverable | Findings | Estimated effort | Dependency |
| --- | --- | --- | --- | --- |
| 1 | Patched tooling, corrected navigation, motion/contrast basics | A01–A05, A16 | 1–2 days | Current working-tree snapshot |
| 2 | Type and browser validation before release | A07, A18 | 1–2 days | Phase 1 dependency alignment |
| 3 | Efficient responsive galleries and reusable lightbox | A10–A12, A17 | 2–3 days | Phase 2 interaction tests |
| 4 | Faster work discovery and clearer project/contact presentation | A08, A09, A14 | 2–3 days | Phase 3 gallery contract; editorial input |
| 5 | Metadata, analytics, video facade, documentation, final verification | A06, A13, A15, A18 | 1–2 days | Confirmed metadata/analytics choice |

Expected total: **7–12 focused development days**, plus editorial input and physical-device checks. Security and navigation fixes can be reviewed/released as a smaller first batch without waiting for the later UI work. Measurement-based P3 experiments are optional and should have a separate time box.

## Phase 1 — Patch tooling and remove immediate friction

### 1.1 Align dependencies and runtime

Files: `package.json`, `package-lock.json`, `.github/workflows/deploy.yml`, new runtime-version file, `README.md`.

Use the verified versions below as the initial compatibility-preserving target. Recheck the registry when implementation begins.

| Package | Current installed | Initial target | Treatment |
| --- | --- | --- | --- |
| astro | 7.2.2 | 7.3.5 | Patch/minor update within current major |
| @astrojs/markdown-remark | 7.2.2 | 7.3.1 | Update with Astro graph |
| @astrojs/mdx | 7.0.5 | 7.0.8 | Stay on current major in first batch |
| @astrojs/sitemap | 3.7.3 | 3.7.4 | Patch |
| daisyui | 5.7.17 | 5.7.46 | Patch; inspect menu/theme rendering |
| vitest | 4.1.10 | 4.1.11 | Security patch |
| yaml | 2.9.0 | 2.9.1 | Patch |
| Node in CI | 22.12.0 | 22.23.3 | Match local version file and CI |

Tailwind, Fontsource, YouTube embed, and analytics packages were not listed as outdated by this registry check; do not create unnecessary upgrades for them. Update transitive packages through their owners and verify Sharp ≥0.35.4, SVGO ≥4.1.0, js-yaml ≥4.3.2, devalue ≥5.9.1, and smol-toml above 1.7.0. If parent updates leave an advisory behind, inspect the dependency chain and select a compatible fix rather than applying forced major changes blindly.

MDX 8.0.2 and Vitest 5.0.2 are optional later upgrades. The checked MDX 8 peer requirements are Astro `^7.2.10`, markdown-remark `^7.3.0`, and markdown-satteri `^0.4.0`; this is not an Astro 8 requirement. Assess migration notes and peer resolution separately from urgent patches. [Astro 7.3.5 release](https://github.com/withastro/astro/releases/tag/astro@7.3.5), [Node patch release](https://nodejs.org/en/blog/release/v22.23.3).

Acceptance:

- Clean install, production build, and existing 116 tests pass on the chosen Node release.
- Re-run the full dependency audit and resolve the eight recorded affected entries; record any remaining issue and its exposure honestly.
- Compare homepage, mobile disclosure, representative project, and BTS visual output after DaisyUI/Astro updates.
- Keep lockfile changes in their own reviewable batch.

### 1.2 Correct hero destinations and navigation visibility

Files: `ProjectHero.astro`, `VideoCard.astro`, `about.mdx`, `behind-the-scenes.mdx`, `Header.astro`.

- About passes `scrollTarget="project-intro"`.
- Add `id="bts-board"` and an appropriate scroll margin to the BTS board; pass that as its hero destination.
- Make the homepage arrow a named link to `selected-work`; ensure the destination lands below the header.
- Retain skip-link behavior and the existing project destination.
- Prevent scroll hiding while the mobile menu is open or focus is inside the header. Normalize disclosure state when crossing the desktop breakpoint.
- Enlarge social-link hit areas without enlarging the icons.

Acceptance: each cue actually reaches content; hash navigation works both on first load and after Astro transitions; Tab/Escape work; navigation with focus never becomes visually concealed.

### 1.3 Add visitor-controlled motion and readable muted text

Files: `VideoCard.astro`, `global.css`, `index.astro`.

- Keep the decorative hero without a Pause/Play control, as requested in the design review.
- Stop the decorative bounce after a short cue; keep the arrow itself available as a link.
- Preserve small-screen and reduced-motion poster behavior; honor data-saving preferences where supported.
- Pause video when out of view or the document is hidden; resume when visible and eligible.
- Keep tested muted-text tokens available for supporting text. Chapter labels have been removed by request. Check text over hero imagery separately.

Acceptance: reduced-motion/mobile visitors do not load the video; playback follows visibility and device policy; any supporting text using the muted token reaches ≥4.5:1.

### 1.4 Replace weak alt descriptions

Files: `behind-the-scenes.mdx`, `project-schema.ts`, `FilmCard.astro`, project records, content tests.

Review the actual 50 numbered BTS photos and replace their descriptions. Improve the BTS hero description. Add optional card-specific alt data or deliberately decorative empty alt alongside a clear link name. Avoid automatically substituting a hero description when the card uses a different photo.

Acceptance: informational images describe their content; decorative cards do not announce duplicate title/author text; tests reject numbered placeholders regardless of punctuation or casing. Photo descriptions can proceed without waiting for award/year research.

## Phase 2 — Establish useful validation

### 2.1 Add type checking and explicit component contracts

Add `@astrojs/check` and the required TypeScript dependency as development tooling, with `npm run check`. Type `BaseLayout`, project template data, hero, intro facts, lightbox inputs, navigation props, and video inputs. Infer project entry types from the content collection instead of duplicating the schema. Remove unused `synopsis` arguments or explicitly render the intended copy. Make missing next/previous entries fail with a meaningful build error.

Strengthen content validation: non-empty required fields, positive integer ordering with uniqueness checked across the collection, appropriate year format, supported video providers/IDs, and matching caption/image relationships. Do not require dates that are unavailable.

Acceptance: `npm run check` succeeds; intentionally invalid records are rejected; the normal build remains static. [Astro type-checking guidance](https://docs.astro.build/en/guides/typescript/).

### 2.2 Add a small browser suite and read-only PR workflow

Add Playwright for behavioral checks and axe-core integration for rendered-page checks. Cover the behaviors that string tests miss rather than snapshotting every class name:

1. About/BTS/home hero destination changes viewport position.
2. Mobile menu opens/closes, Escape returns focus, and navigation resets its state.
3. A gallery opens its modal, traps focus, closes with Escape/backdrop/button, restores focus, and unlocks scrolling.
4. Project contact CTA lands at the contact section.
5. Back/forward navigation preserves usable content and controls.
6. Reduced-motion and no-JavaScript visits keep content and navigation visible.
7. Every route has one meaningful H1, local links/assets resolve, and all 17 projects remain reachable.

Run at 390 × 844 and 1280 × 720; add 320px and 768px coverage for overflow/breakpoints. Use Chromium for fast PR checks and Firefox/WebKit for release verification. An automated WebKit run does not replace actual iOS Safari testing.

Create a PR verification job with read-only permissions that runs clean install, type check, build, Vitest, and focused browser checks. Retain deployment as a separate gated job/workflow, serialize Pages deployments, and limit write permissions to deployment. Add a dependency-update configuration to propose future patch updates for manual review; do not create recurring app automations as part of this plan.

Acceptance: a regression to the old About target fails a behavioral check; the PR job cannot deploy; existing parity tests remain meaningful and are updated intentionally if presentation contracts change.

## Phase 3 — Improve image delivery and galleries

### 3.1 Make responsive images match their layout

Files: `ContentPicture.astro`, `ProjectPage.astro`, `Polaroid.astro`, `polaroid.css`.

Pass an explicit image `sizes` value for grid, wide, and full gallery items. Derive it from the real container width, padding, gap, and breakpoints; do not hard-code `100vw` for everything. At desktop, grid slots cap near 554px, wide near 896px, and full spans the gallery container. Include smaller mobile candidates where needed, while preserving high-resolution lightbox images. Match Polaroid candidates to one/two/three CSS columns and the board cap.

Acceptance: at 1280px/DPR1 the measured 554px slot selects the appropriate small candidate rather than 1440px; at DPR2 it remains crisp. Compare total image bytes under identical navigation/scroll conditions, not just artifact size. Retain correct aspect ratios and zero image-driven layout jumps.

### 3.2 Consolidate lightboxes without losing accessibility

Extend the typed gallery event controller introduced for the Phase 2 focus fix to use one native `<dialog>` per page. Triggers provide the selected image, alt, caption, and sequence position; the controller assigns the full-size image only when opened. Avoid unsafe HTML interpolation for captions. Use unique trigger IDs that remain safe if an image is repeated.

Provide Close, Previous, Next, a position counter, and Left/Right keys. Restore focus to the exact originating trigger. Reset controller listeners on Astro navigation and close active dialogs before page swaps. Keep photos usable without JavaScript, using a link to an optimized full-size image where practical.

Acceptance: BTS has one gallery dialog rather than 81; project galleries have one rather than one per still; modal image transfer waits for opening; controls remain understandable on narrow screens; existing focus/Escape behavior passes browser tests.

### 3.3 Reduce asset-import and build work

Replace the eager global import with a typed lazy lookup or a generated manifest derived from actual referenced assets. Resolve imports on demand. Supply the BTS structured-data image list from the visible gallery data instead of scanning all source folders. Verify the approach on clean builds because Vite asset emission may still require further work even with lazy imports.

Keep pruning until every emitted-file reference is covered. Extend integrity checks to `poster`, `data-src`, srcset, CSS fonts, and social/JSON-LD URLs. Measure clean-build time and emitted originals before/after; do not use warm image-cache timings as evidence of build-speed improvement.

Acceptance: every displayed and social image exists after pruning; unused source selections do not inflate the output; all 21 pages build; document actual cold-build/artifact reductions.

### 3.4 Time-box optional rendering experiments

Measure low-end mobile scrolling with/without grain and permanent Polaroid `will-change`. Keep a visual effect when it is inexpensive; simplify it if traces show substantial paint cost. Examine actual font requests before reducing weights or changing preloads. Stop after a short measurement session if there is no meaningful improvement.

## Phase 4 — Make the portfolio easier to browse and act on

### 4.1 Improve the opening screen and work overview

Files: `index.astro`, `VideoCard.astro`, `Header.astro`, `FilmCard.astro`.

Consider role, location/availability, and clear “Selected work,” “All work,” and “Contact” actions within the opening hero. Keep its direct transition into the project cards, with no introductory section or chapter separators. Preserve the screen-reader H1 and existing card role labels. Make the complete archive accessible from the opening screen; visitors should not need to discover the jump after eight cards. Prefer shorter/compact presentation on phones; use viewport-height hero cards only where the imagery benefits.

Optionally add progressive role/format filters to the 17-item index, with a clear reset and no-results state. Keep the full index visible with JavaScript unavailable. Avoid making filtering a prerequisite for finding a film.

Acceptance: a new visitor can reach any project index or contact in one action; all projects remain linked and crawlable; any approved opening role/location is visible without scrolling; no horizontal overflow at 320px; card headings remain coherent.

### 4.2 Reorder project information for relevance

Files: `ProjectPage.astro`, `ProjectIntro.astro`, `FeaturedAward.astro`, project frontmatter/MDX.

Recommended reading order: hero/title → role/format/year and synopsis → concise featured recognition/contact action → trailer when present → curated opening stills → expanded gallery → credits/festivals/specs → final CTA and adjacent projects.

Show a manageable initial still selection, with an optional “View all stills” expansion that preserves the full gallery. Add captions only when useful and exercise the existing grid/wide/full controls intentionally. Provide a clear return to all work near project navigation. Keep a direct email action available; a contact form is not required.

Acceptance: project role, strongest proof, and a contact option appear before long galleries; the full photo set remains available; next/previous projects and archive return work with keyboard/touch; long titles/credit names wrap at mobile widths.

### 4.3 Complete and reconcile editorial metadata

Ask MrMochi for missing years and current production statuses, and verify credits/awards against supplied or authoritative records. Label Magnum Photos as producer instead of leaving ambiguous “by” text. Split professional biography into concise paragraphs with links to referenced portfolio projects; remove repeated availability wording. Confirm trailer dates/caption availability with the video owners.

Acceptance: each supplied year/status has a known source; unknown values stay omitted; project card, intro, archive, and structured data agree. Follow the latest website-specific identity and contact instructions for website copy, and avoid exposing identifying local paths.

## Phase 5 — Metadata, analytics, video behavior, and release checks

### 5.1 Correct and validate structured data and social cards

Replace unsupported cinematography properties with supported contributor/credit data and truthful role attribution. Add verified video publication dates and unique video descriptions, and pass video titles through both YouTube and Vimeo components. Separate public-image handling from managed-asset optimization so missing assets fail clearly. Centralize identity, contact, site URL, and social-link configuration.

Validate one Movie page, the VR CreativeWork page, About ProfilePage, homepage ItemList, and BTS ImageGallery against the relevant schema definitions. Run the Google Rich Results Test for supported features; valid schema does not guarantee a search enhancement. Preserve existing routes/canonicals and intentional 404 noindex behavior.

Acceptance: no unsupported properties in the validated graph; no fabricated dates; actual social-image URLs resolve; visible attribution matches metadata. [Movie vocabulary](https://schema.org/Movie), [VideoObject requirements](https://developers.google.com/search/docs/appearance/structured-data/video).

### 5.2 Make analytics and third-party media behavior explicit

First inspect GA4 history-measurement settings. Choose one page-view mechanism and verify direct load → project → About/contact → back/forward. Avoid counting fragment-only jumps as new page views unless explicitly desired. Keep analytics disabled in development and automated test builds, including local production previews.

The selected policy, confirmed on 30 September 2026, is opt-in GA4. Load analytics after the visitor's choice and expose an understandable way to change it; account history-measurement settings still require confirmation. This is a product-behavior decision, not a claim that the audit established a legal violation.

Use a Vimeo click-to-load facade with a local poster and accessible play button, plus a direct provider link when embedding fails. Add provider/ID/title contracts so schema and playback normalize IDs consistently. Verify video caption availability manually rather than assuming it from an iframe title.

Acceptance: exactly one page view per intended navigation; no analytics calls in test/dev; opt-in behavior matches the selected policy; both video providers play after activation and have usable fallback links.

### 5.3 Final verification and handoff

- Run clean install, type check, production build, Vitest, internal-route/asset checks, and focused browser/axe tests.
- Verify 320/390/768/1280px layouts, 200% zoom, keyboard navigation, no-JavaScript fallback, reduced motion, and at least one physical iPhone/Safari and Android/Chrome pass.
- Capture comparable performance runs for home, a 39-photo project, BTS, and About. Use median lab runs at fixed throttling; report LCP/CLS/TBT. Field targets are LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 at p75 when field data exists. [Web Vitals guidance](https://web.dev/articles/vitals).
- Recheck dependencies and resolve/document remaining advisories.
- Update README to describe Fontsource, type checking, browser verification, runtime pinning, and the actual deployment workflow.
- Keep implementation batches locally reviewable, with evidence and rollback points. Any requested commits must use normal content-only messages without AI co-author trailers.
- **Remote publication is MrMochi-only.** Agents must not push, use publishing workarounds, or deploy as part of this audit/plan. After MrMochi publishes a later implementation, verify live routes, HTTP 404 status, canonical/social assets, and critical interactions against the tested local version.

## Decisions that should not block independent work

| Decision/input | Needed for | Work that can proceed now |
| --- | --- | --- |
| Missing years and current status for 11 projects | Editorial completion | Dependency, navigation, image, type, and browser work |
| Confirmed video publication dates and captions | Search/video metadata | Metadata contracts and supported credit schema |
| Analytics preference/account settings | Final analytics behavior | All visual, image, navigation, and build work |
| Initial still selection and strongest proof for each project | Gallery curation | Shared lightbox and responsive sizing |

## Completion criteria

Every P1 issue is addressed or explicitly documented with evidence. All 17 films remain accessible, current local editorial improvements are preserved, visitors have early work/contact access, dialogs and navigation work with keyboard/touch, and images download appropriate candidates. Security and behavioral checks run before release. Improvements are measured against a baseline; unmeasured Lighthouse or WCAG claims are not used as evidence.
