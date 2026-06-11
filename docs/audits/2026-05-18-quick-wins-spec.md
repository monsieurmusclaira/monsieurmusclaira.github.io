# Quick Wins Batch — Spec

**Date:** 2026-05-18
**Source:** Full site audit (performance, bugs, SEO) run on 2026-05-18
**Scope:** Low-risk, high-visibility fixes drawn from the audit findings

## Decisions made before scoping

| Question | Answer |
|---|---|
| Canonical domain | Apex (`victormaes.com`) — already configured correctly in `astro.config.mjs`; no code change needed. Fix is GSC/DNS-side. |
| Anna AD credit | Keep the line, leave name blank with TODO comment |
| Bieke Depoorter homepage card | Keep "by Magnum Photos" (intentional) |
| Tears of Things Title Design | Leave as "Titles" placeholder for now |

## Fixes in this batch

1. **Les Homards Immortels laurels (BUG)** — `src/pages/projects/les-homards-immortels.mdx`
   - Lines 55–66 use `<img src="/img/leshomardsimmortels/laurels/*.svg">` but the SVGs live in `src/assets/`. They 404 in production.
   - Convert each `<img>` tag to `<Image>` from `astro:assets` with `resolveImage()`.

2. **Bieke title punctuation** — `src/pages/projects/bieke-depoorter-chance-encounters.mdx`
   - `meta.title` uses `-` separator; everywhere else uses `:`. Normalize to `:`.

3. **Yentl De Baets capitalization** — `src/pages/projects/burning-clouds.mdx`
   - Line 28 writes "Yentl de Baets"; correct casing is "Yentl De Baets".

4. **Movexoom typo** — `src/pages/behind-the-scenes.mdx`
   - "Moxexoom super 8" → "Movexoom super 8".

5. **Delete dead components**
   - `src/components/TrailerCard.astro` — unused
   - `src/components/VideoHero.astro` — imported in `index.astro` but never rendered; references hardcoded S3 URLs
   - `src/layouts/ProjectLayout.astro` — unused
   - Remove unused `VideoHero` import in `src/pages/index.astro`

6. **FilmCard accessibility — grain SVG** — `src/components/FilmCard.astro`
   - Add `aria-hidden="true"` to the decorative grain SVG (line 22).

7. **FilmCard accessibility — keyboard focus** — `src/components/FilmCard.astro`
   - Add `focus-visible:` outline classes to the `<a>` element so keyboard users get a visible focus indicator.

8. **Anna AD credit placeholder** — `src/pages/projects/anna.mdx`
   - Line 30 currently lists Robin Hendrix as both Director and Assistant Director. Set the AD `crewname` to empty string with a TODO comment.

## Out of scope (saved for later batches)

- Image `srcset` / `sizes` (Image Performance batch)
- Orphaned originals shipping in `dist/` (Image Performance batch)
- Project page content expansion (SEO Content batch)
- `Movie` schema enrichment (SEO Content batch)
- Home FilmCard image vs ProjectHero image alignment for the morph (Content decision)
- Duplicate `<filter id="noiseFilter">` across 16 FilmCards (Performance batch)
- `astro-google-analytics` deprecation, AOS replacement (Performance batch)

## Risk assessment

Low. All changes are localized:
- Content typos and laurel image swap touch single MDX files.
- Dead component deletions are non-functional changes verified by build.
- FilmCard accessibility changes are additive Tailwind classes.

Build will be verified with `npm run build` after changes.

## Out-of-code follow-ups (for the user)

- In Google Search Console: confirm the apex property (`victormaes.com`) is the primary; the `www.victormaes.com` property can stay verified but shouldn't be the reporting source.
- Confirm DNS: `www.victormaes.com` should redirect/CNAME to `victormaes.com`.
