# Dependency Upgrade — Design Spec

**Date:** 2026-06-05
**Topic:** Upgrade Astro and all project dependencies, including the major Tailwind 4 + DaisyUI 5 migration.
**Approach:** Phased, codemod-assisted, with Playwright visual regression. Work on the current branch with a commit per phase as rollback points.

## Goal

Bring the portfolio's toolchain current — Astro, MDX, and supporting deps — and migrate the styling system from Tailwind 3 / DaisyUI 4 to Tailwind 4 / DaisyUI 5, **without any visual or behavioral change to the site**. This is a pure upgrade: no redesigns, no new features, no content changes.

## Current state (baseline)

- Node 25.9.0, npm 11.12.1
- Astro 6.3.1; integrations: `@astrojs/sitemap`, `@astrojs/mdx`; `prefetch: true`
- Styling: Tailwind 3.4.19 + DaisyUI 4.12.24, wired via PostCSS (`postcss` + `autoprefixer`); config in `tailwind.config.cjs`
- Tailwind plugins: `@tailwindcss/typography`, `@tailwindcss/aspect-ratio` (the latter disabled via `corePlugins: { aspectRatio: false }`)
- Custom theme `mytheme` (DaisyUI), key colors: `primary #70AA74`, `secondary #F1D74E`, `accent #E08E35`, `neutral #11131d`, `base-100 #eff0f6`, `info #3ABFF8`, `success #36D399`, `warning #F1D74E`, `error #D64D42`
- 20 pages build clean

## Target versions

| Package | Current | Target | Risk |
|---|---|---|---|
| astro | 6.3.1 | 6.4.4 | low (minor) |
| @astrojs/markdown-remark | 7.1.1 | 7.2.0 | low |
| @astrojs/sitemap | 3.7.2 | 3.7.3 | low |
| postcss | 8.5.14 | 8.5.15 | low |
| sass | 1.99.0 | 1.100.0 | low |
| @astrojs/mdx | 5.x | 6.0.2 | moderate (major) |
| tailwindcss | 3.4.19 | 4.3.0 | high (major) |
| daisyui | 4.12.24 | 5.5.20 | high (major) |

## Phases

Each phase ends with: `npm run build` passing (exit 0, all 20 pages) **and** Playwright before/after screenshots matching. Any regression is fixed before the next phase. Commit at the end of each phase.

### Phase 0 — Baseline (no changes)
Capture Playwright screenshots of the key page types as "before" references:
- Homepage (`/`)
- A dense project page (`/projects/a-long-goodbye`)
- About (`/about/`)
- Behind the Scenes (`/behind-the-scenes/`)

Confirm clean baseline build. Baseline artifacts kept in a temp dir (not committed).

### Phase 1 — Safe deps + Astro 6.4.4
Bump `astro` → 6.4.4, `@astrojs/markdown-remark` → 7.2.0, `@astrojs/sitemap` → 3.7.3, `postcss` → 8.5.15, `sass` → 1.100.0. `npm install`, build, re-screenshot, diff. Commit: `chore: upgrade Astro 6.4 + safe deps`.

### Phase 2 — MDX 6
Bump `@astrojs/mdx` → 6.0.2; verify peer-compat with Astro 6.4. Build and spot-check MDX rendering, specifically:
- About page email renders as a single styled link (the `{'hello@victormaes.com'}` JSX-expression guard against GFM auto-linking must still hold; confirm MDX 6 didn't change GFM auto-link defaults).
- Project pages render (credits, FestivalList, ContentPicture, ContentVimeo).

Re-screenshot, diff. Commit: `chore: upgrade @astrojs/mdx to 6`.

### Phase 3 — Tailwind 4 + DaisyUI 5 (highest risk)
1. Run the official codemod `npx @tailwindcss/upgrade` — migrates `@tailwind base/components/utilities` → `@import "tailwindcss"`, ports config, renames changed utilities, updates deps.
2. Wire Tailwind 4 into Astro via the `@tailwindcss/vite` plugin (preferred over PostCSS for Astro 6). Remove `autoprefixer` (Tailwind 4 handles vendor prefixing).
3. Migrate DaisyUI 4 → 5: install `daisyui@5`; replace the `tailwind.config` plugin array with `@plugin "daisyui"` in CSS; re-declare the `mytheme` colors in DaisyUI 5's theme format, preserving exact hexes (including `secondary`/`warning` = `#F1D74E`, `neutral #11131d`, `base-100 #eff0f6`).
4. Migrate Tailwind plugins: `@tailwindcss/typography` → `@plugin "@tailwindcss/typography"` (the `prose` block in `ProjectHero` depends on it). Evaluate dropping `@tailwindcss/aspect-ratio` (aspect-ratio is core in TW4; it was already disabled here).
5. Preserve all custom CSS in `global.css`: grain filter, `drop-in` keyframes, `#credits/#awards/#festivals/#specs/#markets/#funding` sizing, `html { color-scheme: dark }`, `::selection`, link transition.
6. Audit TW4 breaking changes against this codebase:
   - default border color now `currentColor` (check `border-base-100/10` separators stay correct)
   - shadow/rounded/blur renames (codemod handles most)
   - opacity modifiers (`text-base-100/60`, `bg-black/60`) — supported in TW4
   - arbitrary values (`font-['Montserrat']`, `text-[10px]`, `duration-[1400ms]`, `outline-offset-[-6px]`) — supported in TW4
7. Build + full visual regression on all key page types, plus a component spot-check: navbar (links, hover, social icons, hide-on-scroll), FilmCard (grain, hover zoom, focus ring, badges), ProjectHero (title, tagline, scroll indicator, prose), badges, CreditsItem/AwardItem/FeaturedAward/FestivalList, ContentPicture lightbox dialog, Footer, About contact, and the View-Transition morph. Fix regressions. Commit: `chore: migrate to Tailwind 4 + DaisyUI 5`.

### Phase 4 — Verify + cleanup
Full build (all 20 pages). Remove dead config (`tailwind.config.cjs` if fully migrated to CSS, or retain via `@config` if needed; `autoprefixer`; unused plugins). Bump site version to `4.0.0` (reflecting the major framework jump). Commit: `chore: cleanup + v4.0.0`.

## Risk concentration

Phases 1–2 are low risk. Phase 3 holds essentially all the risk. The most likely breakage points:
- DaisyUI component classes used across ~15 components (`hero`, `hero-content`, `navbar`, `navbar-start/center/end`, `badge`, `badge-outline`, `btn`, `btn-ghost`, `btn-circle`, `dropdown`, `dropdown-content`, `menu`, `menu-sm`).
- The `mytheme` semantic colors (`text-base-100`, `text-secondary`, `text-warning`, `bg-neutral`) — depend on the theme being re-declared correctly.
- `prose` typography in `ProjectHero` — depends on the typography plugin working under TW4.
- Default border color change affecting the thin separator rules.

## Testing strategy

- **Build gate:** `npm run build` exits 0 with 20 pages at every phase.
- **Visual regression:** Playwright screenshots of `/`, `/projects/a-long-goodbye`, `/about/`, `/behind-the-scenes/` before and after each phase; compare. Given the extensive custom design, this is the primary safety net.
- **Interactive spot-check:** lightbox `<dialog>`, nav hover/scroll behavior, View-Transition card→hero morph.

## Rollback

Per-phase commits on the current branch provide rollback points; a bad phase is `git revert`-able. Commits are local only — pushing is handled separately per repo policy.

## Out of scope

- Any redesign, new feature, or content change.
- Pushing to the remote (local commits only).
