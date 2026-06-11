# Editorial Project Page Template — Transformation Spec

This spec describes how to convert a project page in `src/pages/projects/*.mdx` to the
new editorial layout. The **canonical reference implementation** is
`src/pages/projects/a-long-goodbye.mdx` — read it first and mirror its structure and
exact class strings. Substitute the target page's real content.

## Components available (import only those you use)

- `ProjectHero` — already used. Now also accepts a `credit` prop (italic director line under the title).
- `ProjectIntro` — metadata strip. Props: `items` = array of `{ label, value }`. (Optional `synopsis` prop — DO NOT pass it; the synopsis stays on the hero.)
- `SectionLabel` — small centered uppercase heading. Prop: `label`.
- `FeaturedAward` — large "AWARDED" highlight. Props: `award`, `festival`, `year` (year optional/omit).
- `AwardItem` — unchanged. One award win (full-width block).
- `FestivalList` — auto two-column list. Prop: `items` = array of strings.
- `ContentPicture` — now accepts `contained` (boolean) to constrain width.
- `NextProject` — footer link. Props: `title`, `url`, `image`, `imageposition`.

## Page order (top to bottom)

1. **Frontmatter + imports** — keep the `meta` object and frontmatter. Update imports to add the new components used and remove `FestivalsItem` if you convert all festival usage to `FestivalList`.

2. **`<ProjectHero ... credit="directed by NAME" />`**
   - Keep `title`, `synopsis={meta.synopsis}`, `heroImage`, `alt`, `imageposition`.
   - Add `credit="directed by X"` where X is the page's own Director/Directors credit name(s). For multiple directors join with " & ". (Documentaries: still "directed by …".)

3. **`<ProjectIntro items={[...]} />`** — metadata strip. Build items in this order, omitting any you cannot determine:
   - `{ label: 'Format', value: '<GENRE>' }` — provided to you (Fiction / Documentary / Experimental).
   - `{ label: 'Role', value: '<VICTOR ROLE>' }` — the `crewfunction` of the CreditsItem whose `crewname` is "Victor Maes" (usually "Cinematographer").
   - `{ label: 'Director', value: '<DIRECTOR(S)>' }` — same name(s) as the hero credit, WITHOUT the "directed by" prefix.
   - **Omit Year entirely.**

4. **First still — full-bleed.** The first standalone still becomes a bare `<ContentPicture image="..." alt={meta.imageAlt} />` with NO outer `<section class="hero"><div class="hero-content">` wrapper (ContentPicture already wraps itself). Remove that redundant double-wrapper everywhere it appears around a single image.

5. **Credits** — wrap in a section with a `<SectionLabel label="Credits" />`:
   - If the page has **12 or fewer** CreditsItems: keep a single `<div id="credits" class="grid grid-cols-2 gap-2 text-base-200" ...>` grid.
   - If **more than 12**: use the two-column desktop layout exactly as in a-long-goodbye (a `max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-16 px-6` wrapper holding two inner `grid grid-cols-2 gap-x-0 gap-y-2 content-start text-base-200` columns). Split at a natural department boundary near the middle.

6. **Awards** (only if the page has actual award WINS, i.e. existing `AwardItem` entries):
   - If ≥2 wins: add `<FeaturedAward award="..." festival="..." />` for the top (first) award, then an Awards section (`<SectionLabel label="Awards" />` + `<div id="awards" ...>`) listing the REMAINING wins (remove the featured one from the list). Omit the `year` unless it is already present in the source.
   - If exactly 1 win: use `<FeaturedAward .../>` only, and omit the Awards list section.
   - If 0 wins: no FeaturedAward, no Awards section.

7. **Festivals / Selections / Markets / Funding** — any section currently built from `FestivalsItem` becomes a `<SectionLabel label="..." />` + `<FestivalList items={[ "name", ... ]} />`. Use these labels: "Festivals", "Markets", "With the Support Of". Preserve the festival name strings exactly (including any parenthetical country codes and existing dashes).

8. **Remaining stills.** Keep the page's other stills. Single stills: full-bleed (bare ContentPicture). Multi-image grids: keep the grid but contain it with `class="hero-content grid grid-cols-1 md:grid-cols-2 gap-3 max-w-6xl mx-auto px-4"`. Preserve all image paths and alts exactly. Preserve any `ContentVimeo` embeds in place.

9. **Laurel image sections** (e.g. les-homards): keep the laurel `<img ... />` block as-is, but precede it with `<SectionLabel label="Selections" />` inside the section.

10. **`<NextProject ... />`** — add at the very end with the provided title/url/image/imageposition.

## Section wrapper pattern

Each labeled non-image section uses:
```
<section class="hero pt-20 pb-4">
    <div class="hero-content flex-col w-full">
        <SectionLabel label="..." />
        ...content...
    </div>
</section>
```
The diptych/last-gallery section before NextProject uses `pt-20 pb-28` for breathing room.

## Hard rules

- Preserve ALL existing image paths, alts, synopsis text, credit names, and festival names verbatim. Do not rename or invent content.
- Do not invent years, awards, or names.
- Every `ContentPicture`/`Image` path must resolve (they already do in the source — keep them identical).
- Keep the page's existing `meta` frontmatter unchanged.
