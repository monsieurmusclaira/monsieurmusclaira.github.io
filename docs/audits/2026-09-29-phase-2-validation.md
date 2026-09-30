# Phase 2 implementation and validation — 29 September 2026

Prepared for MrMochi. Phase 2 of the [implementation plan](2026-09-29-implementation-plan.md) is complete locally. Existing editorial changes and the requested direct hero-to-project layout are preserved.

## Implementation

- Added `npm run check`, Astro check 0.9.10, TypeScript 6.0.3, and Node type definitions. Project contracts derive from the content collection. Layout metadata, hero, intro facts, adjacent navigation, cards, lightbox inputs, credits, awards, and embedded video inputs have explicit types.
- Required content text rejects empty or whitespace-only values. Card ordering requires positive integers and rejects duplicates across the collection during static generation. Known years require four digits; unknown years remain optional. Supported providers require bare YouTube or numeric Vimeo IDs. Award image text requires an associated image, and award images require alternative text. Blank credit/spec continuation labels and secondary badges remain valid.
- Missing adjacent project entries produce an error naming the missing slug. Parity and content tests now parse through the same schema as the build. Removed unused hero synopsis metadata.
- Added Playwright 1.63.0 and axe-core integration 4.13.0. Chromium is the fast PR suite; Chromium, Firefox, and WebKit form the release suite. Each engine uses 1280 × 720 and 390 × 844 viewports, with additional 320px and 768px overflow checks.
- Browser checks cover actual hero scrolling, mobile disclosure and breakpoint focus, focused-header visibility, galleries, contact navigation, history, reduced motion, no-JavaScript navigation, all 21 routes, local links/assets, and reachability of all 17 projects. Six representative pages receive axe WCAG A/AA checks.
- Browser tests own a separate foreground preview on port 4322 and block external requests, including analytics and media providers. They preserve the visitor preview on port 4321. Failure screenshots/traces and HTML reports are ignored by Git and excluded from source type checking.
- Added a read-only PR verification workflow with clean install, type check, build, Vitest, and Chromium checks. Deployment reuses verification with all three engines before artifact upload; Pages write and identity-token permissions belong only to the separate deployment job. Pages deployments are serialized. Weekly Dependabot proposals cover npm patch updates and require manual review.

## Bugs exposed and fixed by browser checks

1. **Reverse Tab could leave a lightbox control in Firefox/WebKit.** Replaced inline gallery handlers with a small typed, delegated event controller. Tab wraps explicitly, native Escape closes the dialog, all close paths restore the originating trigger, and page swaps close active dialogs. Each image still has its own dialog; the single-dialog and deferred-image work remains Phase 3.
2. **Unloaded stills could collapse to zero width after history navigation in Firefox/WebKit.** The gallery grid now has an explicit full width. The history test asserts that the restored trigger has a nonzero width before opening it.

The prior inline-handler string assertion was replaced by structural dialog-name/trigger-target checks. Playwright verifies actual Escape, backdrop, button, focus, and scroll-lock behavior. History tests wait for Astro's completed page swap rather than assuming a changed URL means the DOM is ready.

## Verification results

| Check | Result |
| --- | --- |
| Clean `npm ci` with pinned Node 22.23.3 | Passed; lockfile installed successfully |
| `npm run check` | 54 files, zero errors, warnings, or hints |
| Production build | 21 static pages; pruning completed |
| `npm run test:verify` | 158 tests passed across 9 files |
| `npm run test:browser:all` | 126 checks passed across all 6 browser/viewport projects |
| axe scans | No violations in the configured scans of 6 representative pages across all projects |
| Route/reference checks | All 21 generated pages, local references, and 17 reachable projects passed at both standard viewport sizes in every engine |
| Missing-route behavior | Unknown URL returns custom 404 with noindex; the literal `/404.html` file returns 200 |
| Regression proof | Intercepting only the test browser's About response to restore `#main` makes the existing behavioral test fail: expected scroll position greater than 100px, actual 0px |
| `npm audit` | Zero advisories at any severity |
| Workflow/config validation | YAML parsed; read-only PR permissions, deployment dependency, release gate, and serialized deployment configuration verified |
| `git diff --check` | Passed |

The regression proof changed no served files. The final suite ran against the restored, clean production build. The existing preview remains available at `http://localhost:4321/`.

## Practical limits and handoff

The browser suite verifies local production output on macOS. The GitHub Actions configuration has not been published or run remotely. WebKit automation does not replace physical iOS Safari testing. Third-party playback and analytics behavior are outside these blocked-network checks and remain later-phase work. Automated axe results cover the configured pages/rules and are not a claim of complete WCAG conformance.

Changes remain in the local working tree. No commit, remote publication, or deployment was performed. Publication remains MrMochi-only.

Implementation references: [Astro type checking](https://docs.astro.build/en/guides/typescript/), [Playwright web servers](https://playwright.dev/docs/test-webserver), [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing), and [Playwright browser engines](https://playwright.dev/docs/browsers).
