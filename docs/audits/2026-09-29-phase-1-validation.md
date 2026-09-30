# Phase 1 implementation and validation — 29 September 2026

Prepared for MrMochi. Phase 1 of [the implementation plan](2026-09-29-implementation-plan.md) is complete locally.

This records the initial delivery. The design-review changes at the end supersede the original Pause/Play control and chapter-label treatment.

## Delivered

- Patched Astro, its Markdown/MDX/sitemap integrations, DaisyUI, Vitest, YAML, and affected transitive dependencies. No major framework or test-runner migration.
- Pinned development and CI to Node 22.23.3 through `.nvmrc` and documented clean installation.
- Corrected About and BTS hero destinations; made the home arrow a named link to selected work.
- Kept navigation visible while its menu is open or it contains focus. Reset disclosure state and move focus to a visible control when crossing the desktop breakpoint. Focus reveals the header immediately.
- Expanded Instagram and IMDb hit areas to 44 × 44px.
- Added keyboard-operable Pause/Play animation controls. A manual pause survives Astro client navigation within the visit.
- Kept the poster without assigning video sources on phones, with reduced motion, or with a supported data-saving preference. Pause offscreen/in hidden documents; resume only when eligible and not manually paused.
- Limited arrow bounce to three one-second cycles, with no bounce under reduced motion.
- Replaced the chapter label opacity with a muted text token measuring 7.35:1 against the neutral background.
- Reviewed the 50 numbered BTS photos and replaced their alt descriptions; improved the BTS hero description. Film-card images default to decorative empty alt alongside their existing visible link title.
- Strengthened placeholder-alt detection and added nine controller regression cases.

Two additional issues found during browser validation were fixed in this batch:

1. A browser can blur a desktop link as it becomes hidden before the breakpoint event runs. Tracking the last header focus allows focus to move to the mobile menu button.
2. The intro entrance animation moved the element used as a hash destination. Keeping the section stationary and animating its inner content preserves the 80px scroll margin on initial hash visits.

## Dependency results

| Dependency | Resolved version |
| --- | --- |
| Node used for clean install and tests | 22.23.3 |
| astro | 7.3.5 |
| @astrojs/markdown-remark | 7.3.1 |
| @astrojs/mdx | 7.0.8 |
| @astrojs/sitemap | 3.7.4 |
| daisyui | 5.7.46 |
| vitest | 4.1.11 |
| yaml | 2.9.1 |
| sharp | 0.35.5 |
| svgo | 4.1.0 |
| js-yaml | 4.3.2 |
| devalue | 5.9.4 |
| smol-toml | 1.9.0 |

`npm audit --json` reports **0 known vulnerabilities**, clearing the eight affected package entries recorded in the audit.

The installed npm 10 release hit an internal dependency-tree error when updating Vitest's optional peers. A temporary npm 11.20.0 invocation completed the update. The resulting lockfile passed a clean `npm ci` using npm 10 under the pinned Node runtime; global npm was not changed.

## Verification

| Check | Result |
| --- | --- |
| Clean install under Node 22.23.3 | Pass |
| Final production build | Pass; 21 pages |
| Full Vitest suite | Pass; 125 tests in 9 files |
| Dependency audit | 0 known vulnerabilities |
| Whitespace/error-marker check | `git diff --check` passes |
| Home hero cue after client navigation | `#selected-work`; destination top 96px |
| About cue and initial hash visit | `#project-intro`; destination top remains 80px after the entrance animation |
| BTS cue and initial hash visit | `#bts-board`; destination top 96px |
| Representative project cue | `#project-intro`; destination top 80px |
| Mobile disclosure | Open, scroll, Escape, route reset, breakpoint reset pass |
| Breakpoint focus | Mobile-to-desktop moves to a visible desktop link; desktop-to-mobile moves to the menu button |
| Social targets | Both measured 44 × 44px at mobile width |
| Hero control | Keyboard pause/resume works; pause retained after About → Work navigation |
| Fresh mobile home visit | Video sources remain unset; playback control hidden |
| Offscreen hero | Playback pauses when the selected-work link moves the video out of view |
| Motion cue | Computed duration 1s, iteration count 3 |
| Narrow layout | No horizontal overflow observed on home at 390px or the representative project at 390px/320px |
| Preview console | No warnings or errors captured during the checked interactions |

Browser verification used the Codex in-app browser at 1280 × 720, 390 × 844, and a narrow project check at 320 × 720. Screenshots were saved locally for review.

Controller tests cover reduced motion, small screens, data saving, pause/resume, retained pause, viewport/document visibility, rejected autoplay, pending playback races, and cleanup. Reduced-motion and data-saving policies were tested with controlled browser API doubles; physical-device and broader cross-browser verification remain part of Phase 2.

## Scope and handoff

The pre-existing editorial changes in six files were preserved. No remote deployment, push, or commit was performed. Changes remain available in the working tree for review.

Phases 2–5 remain planned. The next batch adds explicit type checking and browser regression tests, followed by responsive galleries and the later UI/content work.

## Design-review changes — 29 September 2026

At MrMochi's request, removed the animation Pause/Play control, the introductory section below the homepage hero, and all chapter separators. The hero now flows directly into the eight featured cards, preserving their curated order. A screen-reader H1 remains, with project titles as H2 headings. Automatic visibility, reduced-motion, small-screen, and data-saving behavior remains in place.

Updated the controller tests for playback without a manual control. The revised build passes: 21 pages and 123 tests in 9 files. The refreshed browser preview confirms no pause control, intro, or chapter wrappers; no gap between the hero and selected work; and the same eight card destinations in the same order.
