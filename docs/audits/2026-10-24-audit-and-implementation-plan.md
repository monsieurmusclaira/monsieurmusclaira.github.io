# Astro and dependency implementation plan

Date: 24 October 2026
Status: Completed locally with selective adoption. See [implementation results and validation](2026-10-24-astro-implementation.md). No push or deployment performed.

This replaces the earlier plan in this document. The previous UX, UI, general performance and SEO backlog is discarded from the active scope. Earlier audit reports and screenshots remain historical evidence, not a list of work to implement.

## Objective

Update Astro and project dependencies, then make selective use of Astro capabilities that improve this portfolio's loading behavior and maintainability while preserving its current design, content and static GitHub Pages deployment. Adopt features when comparisons demonstrate a useful result; completing an experiment may legitimately mean keeping the current implementation.

## Current implementation and findings

The project already uses static Astro pages, MDX, schema-validated content collections, Astro image optimization, sitemap generation, prefetching and ClientRouter transitions. Interactive behavior is implemented with small JavaScript modules. No framework integration or client/server islands are present.

| Capability | Finding | Decision |
| --- | --- | --- |
| Fonts API | Fontsource CSS imports and manual preload links currently manage fonts. Astro provides centralized font configuration, selective preloads and optimized fallback metrics. | Evaluate and adopt if it simplifies management without a loading or visual regression. |
| Picture and responsive layouts | Image components already generate responsive variants using explicit widths/sizes. Picture format alternatives and automatic layout configuration are not currently used. | Test format alternatives on representative large images; simplify sizing only where equivalent. |
| Prefetch controls | Prefetch and ClientRouter are already enabled; gallery image links explicitly opt out. | Measure and tune the existing policy, rather than treating prefetch as missing. |
| Browser-native cross-document transitions | Navigation currently depends on ClientRouter and Astro lifecycle events. Native transitions are a browser capability supported in Astro sites. | Run a bounded prototype before deciding whether to replace the router. |
| Custom elements | Menu/video behavior uses manually managed listeners and page lifecycle initialization. Custom elements are a browser feature usable inside Astro components. | Consider selective encapsulation after the routing decision. |
| Client islands | Current interactions are small and require no framework runtime. | Do not migrate existing interactions merely to use islands. Revisit for a genuinely complex new widget. |
| Server islands | These require runtime rendering endpoints; the current host serves static output. | Exclude from this implementation. |

The installed Astro declarations expose fontProviders, font configuration and responsive image configuration. Verify exact API signatures against the upgraded, lockfile-installed version during implementation. Version ranges in package.json are not evidence of the exact installed versions or the latest available releases.

## Phase 1 — Establish a focused baseline

Estimate: 0.5–1 day.

1. Record the installed Astro/browser versions and use a clean production build.
2. Capture home, About, a representative project and BTS at desktop/mobile widths. Include DPR 2 for image selection checks.
3. Record compressed CSS/font/image transfer, requested font variants, selected image candidates, and navigation requests. Separate cold page loads from warm navigation.
4. Measure three comparable cold runs per representative route, retaining the median and raw results. Record LCP, CLS and lab responsiveness without presenting lab metrics as field results.
5. Record current navigation behavior: film-card-to-hero animation, back/forward scroll restoration, hash links, lightbox/menu focus, reduced motion and analytics page-view dispatch.

Use a local production preview for repeatability. For comparison runs, keep third-party traffic consistently isolated; separately document production-only analytics cost if measured. Do not reuse historical timings as the new baseline.

Deliverable: a compact baseline report and reproducible measurement configuration. No visual redesign is part of this phase.

## Phase 1A — Update Astro, dependencies and compatible tooling

Estimate: 1–2 days, with additional time if upstream major-version migrations prove substantial. Depends on Phase 1; completes before feature prototypes.

Primary files: `package.json`, `package-lock.json`, `.nvmrc`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `.github/workflows/verify.yml`, `.github/workflows/deploy.yml`, and affected integration code.

### Inventory and choose targets

1. Record exact installed/locked versions, outdated packages, peer-dependency constraints and npm audit results. Distinguish direct dependencies from transitive packages.
2. At implementation time, check npm release metadata, official changelogs and Astro migration guides. Target current stable compatible releases; exclude prereleases. Record current → target versions and required migrations in a small upgrade matrix. Do not assume a package is outdated merely because it appears in this plan.
3. Check Node support for Astro and the full toolchain. Align `.nvmrc`, package engines, Node type definitions and CI with the chosen supported runtime. The current repository pins Node 22.23.3 and declares engines >=22.12.0; these are starting values, not proposed targets.
4. Include all direct production/dev dependencies and relevant GitHub Actions in the inventory. Inspect whether `@astrojs/markdown-remark` is imported directly before deciding whether its explicit dependency remains necessary.

### Upgrade in reviewable groups

1. **Astro ecosystem:** upgrade Astro, MDX, sitemap, Astro check and any directly required markdown tooling together as compatibility requires. Follow each applicable major-version migration guide. Verify content loaders, schema behavior, image transforms, custom build integrations, static output and ClientRouter behavior.
2. **Styling and fonts:** update Tailwind and its Vite/typography plugins, DaisyUI and Fontsource packages. Compare generated styles and screenshots; preserve current appearance. Keep the subsequent Fonts API migration separate from package refreshes.
3. **Language, schema and tests:** update TypeScript, Zod, Vitest, Playwright, axe integration, YAML and Node types in compatible batches. Install browser binaries matching the chosen Playwright version. Fix real compatibility changes without weakening assertions.
4. **CI tooling:** review action release notes and runtime requirements, and update applicable checkout/setup-node/artifact/Pages actions while preserving existing permissions and release gates. Editing workflow files does not authorize triggering publication.
5. Refresh transitive dependencies through normal lockfile resolution. Address actionable advisories using compatible fixes; document unresolved findings, exposure and upstream constraints. Do not use forced audit fixes or blanket major-version updates that bypass compatibility review.

### Validate and establish the upgraded baseline

- Keep package.json and package-lock.json synchronized and verify a clean `npm ci` succeeds with the selected Node version.
- After each meaningful upgrade group, run type checks, build and relevant existing verification. At the upgrade gate, run all existing tests and the desktop/mobile Chromium, Firefox and WebKit matrix.
- Compare routes, canonical metadata, content output, generated/pruned assets, image formats and representative screenshots with Phase 1. Investigate differences instead of updating snapshots indiscriminately.
- Re-run dependency audit and record remaining findings. Do not claim that an empty advisory report guarantees security.
- Repeat the performance baseline after the upgrade, separating browser-tooling changes from application changes. Use the same browser/measurement versions for a before/after comparison where feasible; if tooling changes, report that limitation rather than attributing all differences to Astro.
- Save the upgraded baseline for all subsequent feature experiments. Keep upgrades separate from feature adoption so regressions can be isolated or rolled back as a package/lockfile pair.

Acceptance: compatible stable versions are installed reproducibly, required migrations are complete, existing behavior is preserved, and required checks pass. Any deliberately deferred package has a documented compatibility reason and follow-up condition. No deployment or push occurs during this phase.

Deliverable: upgrade matrix, dependency/lockfile and compatibility changes, validation report, and refreshed baseline.

## Phase 2 — Evaluate Astro's Fonts API

Estimate: 1–1.5 days. Depends on Phase 1A.

Primary files: `astro.config.mjs`, `src/styles/global.css`, `src/components/BaseHead.astro`, plus scrapbook font consumers.

1. Inventory the current Montserrat, EB Garamond and Caveat variants and where they are used.
2. Prototype centralized font configuration and the Astro Font component. Preserve existing font families, style/weight choices and CSS variable contracts.
3. Prefer reproducible local assets or a deliberate build-time provider configuration; avoid introducing runtime third-party font requests.
4. Configure fallbacks appropriate to serif/sans/handwritten usage. Compare fallback rendering and font-swap layout shifts.
5. Preload only the specific above-the-fold files needed by each template. Avoid preloading an entire family indiscriminately.
6. Compare static variants with variable-font output only where the supported weight ranges and total bytes make that worthwhile.
7. Remove superseded imports/preloads after confirming the new output has no duplicates. Remove dependencies only when no longer used.

Acceptance: typography remains visually equivalent; required accented characters render; fonts remain self-hosted at runtime; no duplicate downloads or CLS regression; configuration is simpler. Retain the existing setup if the API migration offers no meaningful maintenance or delivery benefit.

Reference: [Astro fonts](https://docs.astro.build/en/guides/fonts/).

## Phase 3 — Evaluate image formats and responsive layout helpers

Estimate: 1–2 days. Depends on Phase 1A; can be assessed independently of navigation.

Primary files: `src/components/ProjectHero.astro`, `src/components/FilmCard.astro`, `src/components/NextProject.astro`, image utilities and build asset scripts.

1. Choose a small representative sample: dark footage, fine grain, high-detail daylight and a portrait.
2. Compare Picture output with AVIF/WebP alternatives against the current WebP output. Inspect visible quality and decode/loading behavior as well as file size.
3. Verify that generated variants remain compatible with image-manifest generation, asset pruning and existing asset tests.
4. Trial Astro's `layout="full-width"` or `layout="constrained"` where they match the existing geometry. Inspect generated sizes/srcset rather than assuming automatic sizing is more accurate.
5. Keep explicit sizes for irregular galleries or scrapbook layouts when those reflect actual display widths better.
6. Apply successful changes to the relevant shared component; avoid generating extra formats across every image without evidence.

Acceptance: no framing or layout changes, no distorted images, correct fallback formats, intact lazy/eager priorities, and an improvement in relevant delivered bytes without unacceptable quality or build-time cost. Record build time and output size as well as browser transfer. Social-image formats remain compatible with their consumers.

Reference: [Astro images](https://docs.astro.build/en/guides/images/).

## Phase 4 — Prototype native navigation transitions

Estimate: 1.5–2.5 days. Depends on Phase 1A.

Primary files: `src/layouts/BaseLayout.astro`, shared navigation/hero components, `src/lib/hero-video.ts`, `src/lib/work-filters.ts`, `src/lib/lightbox.ts`, `src/components/VideoEmbed.astro`, `src/components/Analytics.astro`.

1. Inventory all astro:page-load, astro:before-swap, transition directives and persisted elements. Identify which behavior depends on ClientRouter.
2. Create an isolated prototype using normal document navigation and native cross-document view transitions where supported.
3. Replace Astro-specific named transition behavior with appropriate native styling in the prototype. Ordinary page navigation must remain usable when transitions are unsupported.
4. Adapt script startup to normal page loads, including back/forward-cache restoration where necessary. Removing ClientRouter alone would leave some existing scripts uninitialized.
5. Verify analytics dispatch for full loads and history restoration without duplicate page views. Preserve the existing tracking policy and local-host safeguards.
6. Compare navigation smoothness, script/lifecycle complexity and transfer behavior with the current implementation.

Decision gate: adopt only if the desired visual continuity and essential interactions survive, fallback navigation works and code becomes materially simpler. Otherwise retain ClientRouter and document the specific features that justify it. Do not maintain two competing routing architectures in production.

Reference: [Astro's comparison of native transitions and ClientRouter](https://docs.astro.build/en/guides/view-transitions/).

## Phase 5 — Tune prefetch and component lifecycle behavior

Estimate: 1–1.5 days. Depends on the Phase 4 routing decision.

### Prefetch policy

1. Inspect actual requests under the selected navigation architecture. ClientRouter enables all-link prefetch defaults; native navigation changes that assumption.
2. Compare the current policy with explicit opt-in for likely next destinations, such as project cards and next-project links.
3. Select hover/tap/viewport behavior per link type based on request cost and navigation benefit. Do not enable viewport prefetch across the whole archive without measuring it.
4. Preserve gallery full-image opt-outs, and test slow connections and data-saving behavior.

Acceptance: likely next-page navigation remains fast; speculative requests are bounded; image links do not accidentally prefetch full-size gallery media. If current defaults win the comparison, retain them.

### Custom elements, only where useful

1. Select one controller with meaningful setup/cleanup complexity, such as the menu or video controls.
2. Prototype connected/disconnected lifecycle handling in a custom element, with guarded registration and listener cleanup.
3. Preserve native controls, accessible names and keyboard behavior. Custom elements should wrap or enhance semantic HTML.
4. Adopt only if the result reduces lifecycle complexity under the chosen navigation model. Do not rewrite simple delegated handlers just for consistency.

References: [Astro prefetch](https://docs.astro.build/en/guides/prefetch/), [Astro scripts and custom elements](https://docs.astro.build/en/guides/client-side-scripts/).

## Islands decision

Client islands remain a future option for a substantial interactive feature such as a map or complex archive explorer. If that need arises, use one framework integration and select hydration timing intentionally: client:load for immediately needed controls, client:visible for below-the-fold widgets, and client:idle for noncritical initialization. Those directives apply to supported framework components, not existing .astro components.

No such feature is included in this plan. Existing menus, filters, video controls and lightboxes do not currently justify a framework migration. Server islands, server actions and a hosting migration are also outside scope.

References: [Client islands](https://docs.astro.build/en/concepts/islands/), [Server islands](https://docs.astro.build/en/guides/server-islands/).

## Final validation and delivery

Estimate: 0.5–1 day. Total estimated effort: 7–12 focused working days, including upgrades and prototypes that may be rejected; substantial upstream migrations may extend this estimate.

- Run Astro check, production build and existing verification tests for adopted changes.
- Add targeted tests for new behavior, especially script initialization after navigation, asset output and duplicate event prevention.
- Run the existing browser matrix before completion; inspect normal/reduced motion, keyboard controls, hash navigation, back/forward and unsupported-transition fallback.
- Repeat the baseline comparisons under identical conditions. Report adopted/rejected experiments, measured changes and remaining limitations.
- Keep each adopted feature in a separate reviewable local change set. No broad cleanup, visual redesign or earlier audit backlog is bundled into these changes.
- Prepare local changes for owner publication. Git pushes and equivalent remote publishing remain MrMochi-only.

The implementation starts with the existing-stack baseline, then dependency upgrades and a refreshed baseline, followed by the Fonts API prototype and image experiments. The routing decision precedes prefetch and custom-element work so those changes target one coherent navigation model.
