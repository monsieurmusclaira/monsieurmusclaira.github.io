# Content Collections Migration — Design

Date: 2026-06-22
Status: Approved (pending written-spec review)
Project: Victor Maes cinematographer portfolio (Astro 6 static site)

## 1. Context and goal

Project data currently lives in three hand-maintained places. Each film is a
standalone MDX page in `src/pages/projects/` that hand-places presentational
components. The homepage (`src/pages/index.astro`) re-types every film as a
`FilmCard` with data that partly duplicates the film pages and partly exists
only on the homepage (the two badges, the display order, which card loads
first). The "next project" link at the bottom of each film is hand-written per
page.

Goal: make each film a single data record. One page template renders every
film in one consistent house layout. The homepage grid and the next-project
links derive themselves from the same data. Adding or editing a film becomes a
matter of editing fields, not placing components or syncing three files.

This is the "Option A" decision: one fixed house layout for all films, accepting
that a few current pages shift section order. The alternative (per-page custom
ordering) was considered and rejected as reintroducing per-page fiddliness.

## 2. Scope

In scope:
- Convert the 17 project pages into a single Astro content collection.
- A schema that validates each film's data at build time.
- A dynamic route that renders the canonical film layout from data plus the
  film's freeform prose.
- Homepage grid generated from the collection.
- Next-project links derived from portfolio order.
- A four-layer test suite (schema, build-and-check, unit, migration parity).

Out of scope:
- The About and Behind the Scenes pages. They are not films and stay as-is.
- Turning prose into structured fields. Prose stays as writing in each file body.
- Per-image art direction flags or per-page custom block order.
- Any visual redesign. The existing presentational components are reused so the
  look is preserved.

## 3. Data model

One collection: `projects`. One entry per film. Each entry has two parts.

### 3.1 Structured fields (frontmatter)

Validated by a Zod schema in the collection config. Field list with intent and
the component each maps to:

Core identity and SEO:
- `title` (string, required): short display title, for example "Burn".
- `seoTitle` (string, required): full title tag, for example
  "Burn — Fiction Short Film | Cinematography by Victor Maes". Kept explicit to
  preserve current SEO exactly.
- `description` (string, required): meta description.
- `director` (string, required).
- `genre` (string, required).
- `format` (string, required): the intro-strip "Format" value (can differ from
  `genre`, for example "Interactive VR Experience").
- `role` (string, required): the intro-strip "Role" value, for example
  "Cinematographer" or "Director".
- `year` (string, optional).

Hero (maps to `ProjectHero`):
- `hero.image` (string, required)
- `hero.alt` (string, required)
- `hero.position` (string, optional, default "50% 50%")
- `hero.credit` (string, required): for example "directed by Cato Catteeuw".
- `synopsis` (string, required): the hero synopsis paragraph.

Homepage card (maps to `FilmCard` on `index.astro`):
- `card.image` (string, required): card image (sometimes same as hero, sometimes
  a different still).
- `card.position` (string, optional, default "50% 50%").
- `card.badge1` (string, required): for example "FICTION".
- `card.badge2` (string, required): for example "IN DISTRIBUTION".
- `card.order` (number, required): position in the portfolio. Drives the
  homepage grid order and the next-project chain.

Optional blocks:
- `featuredAward` (object, optional): `{ award, festival, year }`. Maps to
  `FeaturedAward`.
- `videos` (array, optional) of `{ provider: "youtube" | "vimeo", id, title? }`.
  `youtube` maps to `ContentYoutube` (id is the YouTube link/id it accepts),
  `vimeo` maps to `ContentVimeo` (id is `VimeoId`, optional `title`).
- `gallery` (array, optional) of `{ image, alt }`. Maps to `ContentPicture`,
  rendered as one uniform responsive grid.
- `credits` (array, optional) of `{ function, name }`. Maps to `CreditsItem`
  (`crewfunction`, `crewname`). `function` may be an empty string for
  continuation rows under the previous heading. Order is preserved.
- `festivals` (array of string, optional). Maps to `FestivalList` `items`.
- `awards` (array, optional) of `{ award, festival, year }`. Maps to `AwardItem`.
- `specs` (array, optional) of `{ label, value }`. Maps to `SpecItem`. `label`
  may be empty for continuation rows. Order is preserved.

The intro strip (`ProjectIntro` `items`) is derived from `year`, `format`,
`role`, `director` rather than stored separately, for uniformity.

Note on continuation rows: `CreditsItem` and `SpecItem` treat an empty
function/label as "same heading as the row above" (no divider). The arrays must
preserve order and allow empty strings so this behavior is reproduced exactly.

### 3.2 Body (prose)

The film file body holds only the optional "about the project" prose as normal
Markdown. The template renders it in the About slot. Films with no prose (for
example Burn) have an empty body.

### 3.3 Fields added during implementation

Three bespoke cases surfaced during migration and were added to the model so no
content is lost:

- `lists` (array of `{ label, items: string[] }`, default []): additional
  labelled string-list sections beyond the standard Festivals block. Used by
  A Long Goodbye for "Markets" and "With the Support Of". Rendered after the
  festivals block, each as a section label plus a list.
- `laurels` (array of `{ image, alt }`, default []): a strip of festival laurel
  images. Used by Les Homards Immortels for its "Selections" section. Rendered
  after the lists block under a "Selections" heading.
- `card.desc` (optional string): the homepage card credit line. Defaults to
  `by {director}` when absent. Set explicitly only when the card credit differs
  from the director, as for Bieke Depoorter: Chance Encounters ("by Magnum
  Photos", whose director is Joppe Rog).

Implementation note: Astro's glob content loader returns `undefined` for
frontmatter keys a film omits rather than materialising Zod `.default([])`
values, so the template reads every array field through a `?? []` local and the
homepage applies the `card.desc` fallback explicitly.

## 4. File layout and routing

- Collection content moves to `src/content/projects/<slug>.mdx`, one file per
  film. `<slug>` equals the current filename (for example `burn`).
- Collection is defined in `src/content.config.ts` using the `glob` loader over
  `src/content/projects/` with the Zod schema from section 3.1.
- A dynamic route `src/pages/projects/[slug].astro` uses `getStaticPaths` over
  `getCollection("projects")`, renders `BaseLayout` plus the canonical template
  from `entry.data`, and renders the entry body for the About prose.
- Slugs produce the same URLs as today (for example `/projects/burn/`). See
  section 7.
- The old `src/pages/projects/*.mdx` files are removed as part of the migration.

The canonical template can live in the route file or a dedicated
`ProjectLayout` component. It reuses the existing presentational components.

## 5. Homepage and next-project

- `index.astro` calls `getCollection("projects")`, sorts by `card.order`, and
  maps to `FilmCard`. The `VideoCard` stays at the top. The first card (lowest
  order) is rendered with eager loading and high fetch priority.
- Next-project is derived: for a film at order N, "next" is the film at the next
  order, wrapping from the last back to the first. The `NextProject` component is
  reused, fed from the derived neighbor.
- The ordering and next/previous logic lives in one small module (for example
  `src/lib/projects.ts`) exporting pure functions, so it can be unit tested.

## 6. Canonical render order and consequences

Every film renders blocks in this fixed order. Blocks with no data are skipped:

1. Hero
2. Intro strip
3. Featured award
4. Videos
5. About prose (body)
6. Gallery
7. Credits
8. Festivals
9. Awards
10. Specs
11. Next project

Visible consequences (accepted under Option A):
- Some pages shift section order. Example: Burn currently shows credits before
  its gallery and would now show gallery then credits.
- Galleries render as one uniform grid. Pages that currently separate a single
  full-width still from a grid (for example World Wood Web) show all stills in
  the same grid.
- Next-project now follows portfolio order, so some films point to a different
  next film than today.

Deliverable during implementation: a before/after report listing every page
whose section order or next-project target changes, for sign-off.

## 7. URL preservation

Every film keeps its exact current URL, for example `/projects/burn/`. The build
continues to emit `/projects/<slug>/index.html`. No redirects needed. The
build-and-check tests assert each expected URL exists.

## 8. Testing

Four layers.

1. Schema validation. The Zod schema enforces the data shape at build time. A
   missing or malformed field fails the build. No separate test needed beyond a
   successful build.

2. Build-and-check tests (Vitest). After a production build, assert against the
   built output:
   - The homepage links to all 17 films.
   - Each `/projects/<slug>/` page exists and is non-empty.
   - Each film page references its hero and gallery images (resolved asset URLs
     present).
   - Each film page contains a next-project link to a valid film URL.

3. Unit tests (Vitest). Cover the pure logic in `src/lib/projects.ts`:
   ordering by `card.order`, next-project derivation including wraparound, and
   homepage list construction.

4. Migration parity check. Before migration, snapshot every current page's
   counts into a committed fixture: number of gallery images, number of credits,
   number of awards, number of festivals, number of specs, plus title and hero
   image, keyed by slug. After migration, a Vitest test recomputes the same
   counts from the new collection data and asserts equality against the fixture.
   This proves the migration dropped no content.

Tooling: add Vitest as a dev dependency and an `npm test` script. The
build-and-check layer runs a build first (or runs against a prebuilt `dist`).

## 9. Migration approach (phased)

1. Capture the parity baseline from the current source into the fixture.
2. Set up the collection config, the `src/lib/projects.ts` helper, and the
   dynamic route. Migrate ONE film (a complex one, for example Burn) into the
   new collection and confirm the rendered page matches the current page.
3. Add the unit tests and build-and-check tests. Get them green on the single
   migrated film plus the still-old pages.
4. Migrate the remaining 16 films, one at a time, each verified against the
   parity check.
5. Switch the homepage to the generated grid and remove the old per-page
   next-project markup and the old `src/pages/projects/*.mdx` files.
6. Full build and full test run green. Produce the before/after order report.

## 10. Sequencing and git

- Before starting, the self-hosted fonts work currently in the working tree
  should be committed by MrMochi, so this refactor lands as its own clean,
  reviewable change.
- All changes are made locally. Committing is done by MrMochi. No pushing.

## 11. Risks and mitigations

- Risk: migration silently drops content. Mitigation: layer-4 parity check.
- Risk: a film disappears from the site or a link breaks. Mitigation: layer-2
  build-and-check on homepage coverage, page existence, and next links.
- Risk: continuation-row credits/specs collapse incorrectly. Mitigation: arrays
  preserve order and empty headings, parity check counts credits and specs.
- Risk: URL change harms SEO. Mitigation: slugs equal current filenames, tests
  assert each expected URL.
- Risk: section-order shifts surprise the owner. Mitigation: before/after report
  for sign-off.

## 12. Out-of-scope follow-ups (not now)

- Self-hosting the AOS scroll-animation library.
- Optional per-image "feature" flag for full-width stills, if uniform galleries
  ever feel too flat.
- Migrating About or Behind the Scenes into collections.
