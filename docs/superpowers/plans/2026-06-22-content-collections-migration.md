# Content Collections Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the 17 hand-built project pages into a single Astro content collection that drives the film pages, the homepage grid, and the next-project links from one data source, guarded by a four-layer test suite.

**Architecture:** Each film becomes a collection entry: structured frontmatter (validated by Zod) plus an optional Markdown body for the "about" prose. A dynamic route renders every film in one canonical block order, reusing the existing presentational components. The homepage and next-project links derive from the collection. Migration is incremental and gated by a parity check so no content is lost. The full spec is at `docs/superpowers/specs/2026-06-22-content-collections-migration-design.md`.

**Tech Stack:** Astro 6.4.4 (content collections via `astro:content` + `glob` loader from `astro/loaders`), MDX, Zod (re-exported by `astro:content`), Vitest, Tailwind 4, daisyUI 5.

## Global Constraints

- Astro 6.4.4 static build. Output is `dist/`. Build command is `npm run build` (runs `astro build && node scripts/prune-unused-assets.mjs`).
- Every film keeps its exact current URL `/projects/<slug>/`. Slug equals the current filename.
- Work directly on the `master` branch. Commit each task locally with `git commit` after its tests pass. Never run `git push` in any form. Commit messages must NOT include any AI attribution or co-author trailer (no "Co-Authored-By: Claude", no "Generated with Claude").
- No em dashes and no semicolons in prose written into docs or page copy. Existing film prose is migrated verbatim and not reworded.
- The site legitimately displays "Victor Maes" (it is his portfolio). The identity-scrub rule does not apply to this site's own content.
- Presentational components are reused as-is. No visual redesign. Component prop names are fixed: `ProjectHero(title, synopsis, credit, heroImage, alt, imageposition)`, `ProjectIntro(synopsis?, items=[{label,value}])`, `FeaturedAward(award, festival, year)`, `ContentYoutube(YoutubeLink)`, `ContentVimeo(VimeoId, title?)`, `ContentPicture(image, alt, contained?)`, `CreditsItem(crewfunction, crewname)`, `FestivalList(items=[string])`, `AwardItem(award, festival, year)`, `SpecItem(label, value)`, `NextProject(title, url, image, imageposition)`.
- Image paths are the `/img/...` form consumed by `resolveImage` from `src/utils/images.ts`.

---

### Task 1: Add Vitest tooling

**Files:**
- Modify: `package.json` (add devDependency and `test` script)
- Create: `vitest.config.ts`
- Create: `tests/smoke.test.ts`

**Interfaces:**
- Produces: an `npm test` command that runs Vitest over `tests/**/*.test.ts`.

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest`
Expected: `vitest` appears under devDependencies in `package.json`.

- [ ] **Step 2: Create Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 3: Add the test script**

In `package.json` `scripts`, add:

```json
"test": "vitest run"
```

- [ ] **Step 4: Write a smoke test**

Create `tests/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("test harness", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run it**

Run: `npm test`
Expected: 1 passing test.

- [ ] **Step 6: Commit (local, no push)**

```bash
git add package.json package-lock.json vitest.config.ts tests/smoke.test.ts
```
Commit message: `chore: add Vitest test harness`. Run `git commit` locally with this message. Do not push. Do not add any AI attribution or co-author trailer.

---

### Task 2: Capture the migration parity baseline

Snapshot the content counts of the current pages BEFORE any film is migrated, so a later test can prove nothing was dropped.

**Files:**
- Create: `scripts/migration/parity-baseline.mjs`
- Create: `tests/fixtures/parity-baseline.json` (generated output, committed)

**Interfaces:**
- Produces: `tests/fixtures/parity-baseline.json`, an object keyed by slug, each value `{ seoTitle, heroImage, gallery, credits, awards, festivals, specs, featuredAward }` where the counts are integers and `featuredAward` is a boolean.

- [ ] **Step 1: Write the baseline generator**

Create `scripts/migration/parity-baseline.mjs`:

```js
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SRC = "src/pages/projects";
const OUT = "tests/fixtures/parity-baseline.json";

const count = (text, token) => (text.match(new RegExp(token, "g")) || []).length;

// Count string literals inside the FestivalList items={[ ... ]} array.
function festivalCount(text) {
  const m = text.match(/<FestivalList[^>]*items=\{\[([\s\S]*?)\]\}/);
  if (!m) return 0;
  return (m[1].match(/"(?:[^"\\]|\\.)*"/g) || []).length;
}

function field(text, key) {
  // frontmatter line like:  title: "..."
  const m = text.match(new RegExp(`^${key}:\\s*"([\\s\\S]*?)"`, "m"));
  return m ? m[1] : null;
}

function metaField(text, key) {
  // meta export entry like:  heroImage: '...'
  const m = text.match(new RegExp(`${key}:\\s*['"]([\\s\\S]*?)['"]`));
  return m ? m[1] : null;
}

const result = {};
for (const file of readdirSync(SRC).filter((f) => f.endsWith(".mdx"))) {
  const slug = file.replace(/\.mdx$/, "");
  const text = readFileSync(join(SRC, file), "utf-8");
  result[slug] = {
    seoTitle: field(text, "title"),
    heroImage: metaField(text, "heroImage") || field(text, "image"),
    gallery: count(text, "<ContentPicture\\b"),
    credits: count(text, "<CreditsItem\\b"),
    awards: count(text, "<AwardItem\\b"),
    festivals: festivalCount(text),
    specs: count(text, "<SpecItem\\b"),
    featuredAward: count(text, "<FeaturedAward\\b") > 0,
  };
}

mkdirSync("tests/fixtures", { recursive: true });
writeFileSync(OUT, JSON.stringify(result, null, 2) + "\n");
console.log(`wrote ${OUT} for ${Object.keys(result).length} films`);
```

- [ ] **Step 2: Run it**

Run: `node scripts/migration/parity-baseline.mjs`
Expected: `wrote tests/fixtures/parity-baseline.json for 17 films`.

- [ ] **Step 3: Sanity-check the fixture**

Run: `node -e "const d=require('./tests/fixtures/parity-baseline.json'); console.log(d.burn); console.log(Object.keys(d).length)"`
Expected: burn shows `gallery: 31`, `credits: 25`, `festivals: 1`, `specs: 4`, `featuredAward: true`, and total `17`. (Cross-check against the component matrix in the spec.)

- [ ] **Step 4: Commit (local, no push)**

```bash
git add scripts/migration/parity-baseline.mjs tests/fixtures/parity-baseline.json
```
Commit message: `test: capture project content parity baseline`. Run `git commit` locally with this message. Do not push. Do not add any AI attribution or co-author trailer.

---

### Task 3: Project ordering helper with unit tests

Pure functions for ordering and next-project derivation, testable without Astro.

**Files:**
- Create: `src/lib/projects.ts`
- Create: `tests/projects.test.ts`

**Interfaces:**
- Produces:
  - `type ProjectCard = { slug: string; order: number; title: string; image: string; position: string; badge1: string; badge2: string }`
  - `sortByOrder<T extends { order: number }>(items: T[]): T[]` returns a new array sorted ascending by `order`.
  - `nextSlug(slug: string, ordered: { slug: string; order: number }[]): string` returns the slug of the next film by order, wrapping from the last back to the first. Throws if `slug` is not present.

- [ ] **Step 1: Write the failing tests**

Create `tests/projects.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { sortByOrder, nextSlug } from "../src/lib/projects";

const sample = [
  { slug: "c", order: 3 },
  { slug: "a", order: 1 },
  { slug: "b", order: 2 },
];

describe("sortByOrder", () => {
  it("sorts ascending by order without mutating input", () => {
    const out = sortByOrder(sample);
    expect(out.map((x) => x.slug)).toEqual(["a", "b", "c"]);
    expect(sample[0].slug).toBe("c");
  });
});

describe("nextSlug", () => {
  const ordered = sortByOrder(sample);
  it("returns the following film by order", () => {
    expect(nextSlug("a", ordered)).toBe("b");
    expect(nextSlug("b", ordered)).toBe("c");
  });
  it("wraps from the last back to the first", () => {
    expect(nextSlug("c", ordered)).toBe("a");
  });
  it("throws when the slug is unknown", () => {
    expect(() => nextSlug("z", ordered)).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/projects.test.ts`
Expected: FAIL (module `../src/lib/projects` not found).

- [ ] **Step 3: Implement the helper**

Create `src/lib/projects.ts`:

```ts
export type ProjectCard = {
  slug: string;
  order: number;
  title: string;
  image: string;
  position: string;
  badge1: string;
  badge2: string;
};

export function sortByOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order);
}

export function nextSlug(
  slug: string,
  ordered: { slug: string; order: number }[],
): string {
  const index = ordered.findIndex((p) => p.slug === slug);
  if (index === -1) throw new Error(`Unknown project slug: ${slug}`);
  const next = ordered[(index + 1) % ordered.length];
  return next.slug;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- tests/projects.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit (local, no push)**

```bash
git add src/lib/projects.ts tests/projects.test.ts
```
Commit message: `feat: add project ordering and next-project helpers`. Run `git commit` locally with this message. Do not push. Do not add any AI attribution or co-author trailer.

---

### Task 4: Define the collection and schema

**Files:**
- Create: `src/content.config.ts`
- Create: `tests/schema.test.ts`

**Interfaces:**
- Produces: a `projects` collection whose entry `data` has the shape in spec section 3.1. Exact Zod schema is below. Later tasks consume `getCollection("projects")` and `entry.data`.

- [ ] **Step 1: Write the schema**

Create `src/content.config.ts`:

```ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const projects = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    seoTitle: z.string(),
    description: z.string(),
    director: z.string(),
    genre: z.string(),
    format: z.string(),
    role: z.string(),
    year: z.string().optional(),
    synopsis: z.string(),
    hero: z.object({
      image: z.string(),
      alt: z.string(),
      position: z.string().default("50% 50%"),
      credit: z.string(),
    }),
    card: z.object({
      image: z.string(),
      position: z.string().default("50% 50%"),
      badge1: z.string(),
      badge2: z.string(),
      order: z.number(),
    }),
    featuredAward: z
      .object({ award: z.string(), festival: z.string(), year: z.string().optional() })
      .optional(),
    videos: z
      .array(
        z.object({
          provider: z.enum(["youtube", "vimeo"]),
          id: z.string(),
          title: z.string().optional(),
        }),
      )
      .default([]),
    gallery: z.array(z.object({ image: z.string(), alt: z.string() })).default([]),
    credits: z.array(z.object({ function: z.string(), name: z.string() })).default([]),
    festivals: z.array(z.string()).default([]),
    awards: z
      .array(z.object({ award: z.string(), festival: z.string(), year: z.string().optional() }))
      .default([]),
    specs: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
  }),
});

export const collections = { projects };
```

- [ ] **Step 2: Create the empty collection directory**

Run: `mkdir -p src/content/projects`
(The collection has no entries yet. That is fine until Task 5.)

- [ ] **Step 3: Write a schema-validation test**

Create `tests/schema.test.ts`. This imports the raw Zod object by extracting it to a shared module so it can be unit tested. First refactor `src/content.config.ts` to export the schema:

In `src/content.config.ts`, replace the inline schema with a named export and reuse it:

```ts
// add near the top, after imports
export const projectSchema = z.object({
  // ... move the exact object from Step 1 here ...
});
```
and change the collection to `schema: projectSchema`.

Then create `tests/schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { projectSchema } from "../src/content.config";

const valid = {
  title: "Burn",
  seoTitle: "Burn — Fiction Short Film | Cinematography by Victor Maes",
  description: "A fiction film.",
  director: "Cato Catteeuw",
  genre: "Fiction",
  format: "Fiction",
  role: "Cinematographer",
  year: "2023",
  synopsis: "A streetcar ride by the sea.",
  hero: { image: "/img/burn/stills/x.png", alt: "Burn still", credit: "directed by Cato Catteeuw" },
  card: { image: "/img/burn/stills/x.png", badge1: "FICTION", badge2: "IN DISTRIBUTION", order: 4 },
};

describe("projectSchema", () => {
  it("accepts a valid film and applies array defaults", () => {
    const parsed = projectSchema.parse(valid);
    expect(parsed.gallery).toEqual([]);
    expect(parsed.hero.position).toBe("50% 50%");
  });
  it("rejects a film missing a required field", () => {
    const bad = { ...valid };
    delete bad.synopsis;
    expect(() => projectSchema.parse(bad)).toThrow();
  });
  it("rejects a non-numeric card order", () => {
    const bad = { ...valid, card: { ...valid.card, order: "first" } };
    expect(() => projectSchema.parse(bad)).toThrow();
  });
});
```

Note: importing `astro:content` in a plain Vitest run can fail because it is a virtual module. If the import errors, define `projectSchema` in a standalone file `src/lib/project-schema.ts` that imports `z` from `zod` directly (add `zod` via `npm install -D zod` only if not already resolvable), and have `src/content.config.ts` import `projectSchema` from there. Prefer this standalone-file approach to keep the schema unit-testable.

- [ ] **Step 4: Run the schema test**

Run: `npm test -- tests/schema.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Verify the build still succeeds with an empty collection**

Run: `npm run build`
Expected: build completes, 21 pages (the empty collection adds no routes yet).

- [ ] **Step 6: Commit (local, no push)**

```bash
git add src/content.config.ts src/lib/project-schema.ts tests/schema.test.ts
```
Commit message: `feat: define projects collection schema`. Run `git commit` locally with this message. Do not push. Do not add any AI attribution or co-author trailer.

---

### Task 5: Canonical film template, dynamic route, and first migrated film (Burn)

Build the route and template, then migrate Burn as the exemplar. Burn exercises featured award, video, gallery, credits, festivals, and specs.

**Files:**
- Create: `src/components/ProjectPage.astro` (the canonical template)
- Create: `src/pages/projects/[slug].astro` (the route)
- Create: `src/content/projects/burn.mdx`
- Delete: `src/pages/projects/burn.mdx`
- Create: `tests/parity.test.ts`

**Interfaces:**
- Consumes: `getCollection("projects")`, `entry.data` (Task 4), `sortByOrder`, `nextSlug` (Task 3), `resolveImage` (existing).
- Produces: `/projects/burn/` rendered from data. `tests/parity.test.ts` that compares collection data counts to the baseline fixture for every migrated film.

- [ ] **Step 1: Write the canonical template**

Create `src/components/ProjectPage.astro`. It renders the fixed block order from spec section 6, reusing existing components. `next` is passed in by the route.

```astro
---
import ProjectHero from "./ProjectHero.astro";
import ProjectIntro from "./ProjectIntro.astro";
import SectionLabel from "./SectionLabel.astro";
import FeaturedAward from "./FeaturedAward.astro";
import ContentYoutube from "./ContentYoutube.astro";
import ContentVimeo from "./ContentVimeo.astro";
import ContentPicture from "./ContentPicture.astro";
import CreditsItem from "./CreditsItem.astro";
import FestivalList from "./FestivalList.astro";
import AwardItem from "./AwardItem.astro";
import SpecItem from "./SpecItem.astro";
import NextProject from "./NextProject.astro";

const { data, next } = Astro.props;
const introItems = [
  data.year && { label: "Year", value: data.year },
  { label: "Format", value: data.format },
  { label: "Role", value: data.role },
  { label: "Director", value: data.director },
].filter(Boolean);
---

<ProjectHero
  title={data.title}
  synopsis={data.synopsis}
  credit={data.hero.credit}
  heroImage={data.hero.image}
  alt={data.hero.alt}
  imageposition={data.hero.position}
/>

<ProjectIntro items={introItems} />

{data.featuredAward && (
  <FeaturedAward
    award={data.featuredAward.award}
    festival={data.featuredAward.festival}
    year={data.featuredAward.year}
  />
)}

{data.videos.map((v) =>
  v.provider === "youtube" ? (
    <ContentYoutube YoutubeLink={v.id} />
  ) : (
    <ContentVimeo VimeoId={v.id} title={v.title} />
  ),
)}

<slot />

{data.gallery.length > 0 && (
  <section class="hero pt-10 pb-4">
    <div class="hero-content grid grid-cols-1 md:grid-cols-2 gap-3 max-w-6xl mx-auto px-4">
      {data.gallery.map((g) => <ContentPicture image={g.image} alt={g.alt} />)}
    </div>
  </section>
)}

{data.credits.length > 0 && (
  <section class="hero pt-20 pb-4">
    <div class="hero-content flex-col w-full">
      <SectionLabel label="Credits" />
      <div class="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-16 px-6" data-aos="fade-up" data-aos-duration="600">
        <div class="grid grid-cols-2 gap-x-0 gap-y-2 content-start text-base-200">
          {data.credits.map((c) => <CreditsItem crewfunction={c.function} crewname={c.name} />)}
        </div>
      </div>
    </div>
  </section>
)}

{data.festivals.length > 0 && (
  <section class="hero pt-20 pb-4">
    <div class="hero-content flex-col w-full">
      <SectionLabel label="Festivals" />
      <FestivalList items={data.festivals} />
    </div>
  </section>
)}

{data.awards.length > 0 && (
  <section class="hero pt-20 pb-4">
    <div class="hero-content flex-col w-full">
      <SectionLabel label="Awards" />
      <div class="w-full max-w-4xl mx-auto grid grid-cols-2 gap-y-1 px-6" data-aos="fade-up" data-aos-duration="600">
        {data.awards.map((a) => <AwardItem award={a.award} festival={a.festival} year={a.year} />)}
      </div>
    </div>
  </section>
)}

{data.specs.length > 0 && (
  <section class="hero pt-20 pb-28">
    <div class="hero-content flex-col w-full">
      <SectionLabel label="Specs" />
      <div id="specs" class="grid grid-cols-2 gap-2 text-base-200" data-aos="fade-up" data-aos-duration="600">
        {data.specs.map((s) => <SpecItem label={s.label} value={s.value} />)}
      </div>
    </div>
  </section>
)}

<NextProject title={next.title} url={next.url} image={next.image} imageposition={next.position} />
```

Note: the About prose is injected via `<slot />` between the videos and the gallery. The route renders the entry body into that slot.

- [ ] **Step 2: Write the dynamic route**

Create `src/pages/projects/[slug].astro`:

```astro
---
import { getCollection, render } from "astro:content";
import BaseLayout from "../../layouts/BaseLayout.astro";
import ProjectPage from "../../components/ProjectPage.astro";
import { sortByOrder, nextSlug } from "../../lib/projects";

export async function getStaticPaths() {
  const all = await getCollection("projects");
  const ordered = sortByOrder(all.map((e) => ({ slug: e.id, order: e.data.card.order })));
  return all.map((entry) => {
    const ns = nextSlug(entry.id, ordered);
    const nextEntry = all.find((e) => e.id === ns);
    return {
      params: { slug: entry.id },
      props: {
        entry,
        next: {
          title: nextEntry.data.title,
          url: `/projects/${nextEntry.id}/`,
          image: nextEntry.data.card.image,
          position: nextEntry.data.card.position,
        },
      },
    };
  });
}

const { entry, next } = Astro.props;
const { Content } = await render(entry);
const { seoTitle, description, hero } = entry.data;
---

<BaseLayout
  title={seoTitle}
  description={description}
  image={hero.image}
  imageAlt={hero.alt}
  frontmatter={{ director: entry.data.director, genre: entry.data.genre, year: entry.data.year }}
>
  <ProjectPage data={entry.data} next={next}>
    <Content />
  </ProjectPage>
</BaseLayout>
```

Note: confirm `BaseHead` reads `director`/`genre`/`year` for Movie schema. It reads them from `Astro.props.frontmatter`. Passing `frontmatter={{...}}` preserves the existing Movie schema enrichment. Verify in Step 6.

- [ ] **Step 3: Migrate Burn into the collection**

Create `src/content/projects/burn.mdx` by transforming `src/pages/projects/burn.mdx` using this mapping:
- Frontmatter `title` to `seoTitle`. `meta.title` to `title`. `description` stays. `director`, `genre` stay. `year` stays.
- `meta.synopsis` to `synopsis`. `meta.heroImage` to `hero.image`. `meta.imageposition` to `hero.position`. `meta.imageAlt` to `hero.alt`. The `credit` prop on `<ProjectHero>` ("directed by Cato Catteeuw") to `hero.credit`.
- `<ProjectIntro>` Format/Role/Director values to `format`, `role`, `director` (director already set).
- Homepage card data for burn from `src/pages/index.astro` (the `<FilmCard>` for Burn): `img` to `card.image`, `imageposition` to `card.position`, `badge1` to `card.badge1`, `badge2` to `card.badge2`. `card.order` is Burn's position in the homepage FilmCard list (count from the top, starting at 1).
- `<FeaturedAward>` to `featuredAward`.
- `<ContentYoutube YoutubeLink="...">` to `videos: [{ provider: "youtube", id: "..." }]`.
- Each `<ContentPicture image alt>` in document order to a `gallery` entry `{ image, alt }`.
- Each `<CreditsItem crewfunction crewname>` in document order to a `credits` entry `{ function, name }` (empty function stays empty).
- `<FestivalList items=[...]>` strings to `festivals`.
- `<SpecItem label value>` to `specs`.
- Burn has no "about" prose, so the body is empty.

Result `src/content/projects/burn.mdx` frontmatter (fill the gallery and credits arrays from the source in order):

```mdx
---
title: "Burn"
seoTitle: "Burn — Fiction Short Film | Cinematography by Victor Maes"
description: "A fiction film about Robin looking back on her turbulent relationship with Ada during a streetcar ride by the sea."
director: "Cato Catteeuw"
genre: "Fiction"
format: "Fiction"
role: "Cinematographer"
year: "2023"
synopsis: "During a streetcar ride by the sea, Robin looks back on her turbulent relationship with Ada. All that remains are the unspoken words and the shards she tries to put together. Why aren’t they sharp enough?"
hero:
  image: "/img/burn/stills/BURN_1.232.1.png"
  alt: "Burn cinematography still"
  position: "50% 50%"
  credit: "directed by Cato Catteeuw"
card:
  image: "/img/burn/stills/BURN_1.232.1.png"
  position: "50% 50%"
  badge1: "FICTION"
  badge2: "IN DISTRIBUTION"
  order: 4
featuredAward:
  award: "Honourable Mention"
  festival: "KFL Wildcards"
  year: "2023"
videos:
  - provider: "youtube"
    id: "https://youtu.be/M60QLhGWE1g"
festivals:
  - "International Short Film Festival Leuven (BE)"
specs:
  - { label: "Recording Format", value: "Digital" }
  - { label: "Camera", value: "Alexa Mini LF" }
  - { label: "Lenses", value: "Canon Sumire" }
  - { label: "Aspect Ratio", value: "1.77" }
gallery:
  - { image: "/img/burn/stills/20231102_BURN_1.1.1.png", alt: "Burn — film still 1" }
  # ... continue for all 31 ContentPicture entries in document order ...
credits:
  - { function: "Director", name: "Cato Catteeuw" }
  - { function: "Cast", name: "Cato Catteeuw" }
  # ... continue for all 25 CreditsItem entries in document order ...
---
```

Then delete the old page:

Run: `git rm src/pages/projects/burn.mdx`

- [ ] **Step 4: Write the parity test**

Create `tests/parity.test.ts`. It reads the committed baseline and the migrated collection files, and for every slug present in `src/content/projects`, asserts the counts match. It parses the MDX frontmatter with a YAML parser.

```ts
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import baseline from "./fixtures/parity-baseline.json";

const DIR = "src/content/projects";

function loadData(slug: string) {
  const text = readFileSync(join(DIR, `${slug}.mdx`), "utf-8");
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  return parse(fm[1]);
}

const migrated = existsSync(DIR)
  ? readdirSync(DIR).filter((f) => f.endsWith(".mdx")).map((f) => f.replace(/\.mdx$/, ""))
  : [];

describe("migration parity", () => {
  for (const slug of migrated) {
    it(`${slug} preserves all content`, () => {
      const base = baseline[slug];
      const data = loadData(slug);
      expect(data.seoTitle).toBe(base.seoTitle);
      expect(data.hero.image).toBe(base.heroImage);
      expect((data.gallery || []).length).toBe(base.gallery);
      expect((data.credits || []).length).toBe(base.credits);
      expect((data.awards || []).length).toBe(base.awards);
      expect((data.festivals || []).length).toBe(base.festivals);
      expect((data.specs || []).length).toBe(base.specs);
      expect(Boolean(data.featuredAward)).toBe(base.featuredAward);
    });
  }
});
```

Install the YAML parser if not present: `npm install -D yaml`.

- [ ] **Step 5: Run the parity test for Burn**

Run: `npm test -- tests/parity.test.ts`
Expected: PASS for `burn` (gallery 31, credits 25, festivals 1, specs 4, featuredAward true). If counts differ, the Burn frontmatter is missing entries. Fix the arrays until green.

- [ ] **Step 6: Build and verify the Burn page**

Run: `npm run build`
Expected: build succeeds, `/projects/burn/` builds from the route. Then:
Run: `grep -l "BURN_1.232.1" dist/projects/burn/index.html && grep -o '"@type":"Movie"' dist/projects/burn/index.html | head -1`
Expected: the hero image is referenced and the Movie schema is present (proves `director`/`genre`/`year` passthrough works).

- [ ] **Step 7: Visually confirm parity against the old page**

Start the dev server and compare `/projects/burn/` to the pre-migration layout. Confirm hero, intro, award, video, gallery, credits, festivals, specs all render. Note expected Option A differences (gallery now before credits).

- [ ] **Step 8: Commit (local, no push)**

```bash
git add src/components/ProjectPage.astro src/pages/projects/\[slug\].astro src/content/projects/burn.mdx tests/parity.test.ts package.json package-lock.json
git rm src/pages/projects/burn.mdx
```
Commit message: `feat: render films from collection, migrate Burn`. Run `git commit` locally with this message. Do not push. Do not add any AI attribution or co-author trailer.

---

### Task 6: Migrate the remaining 16 films

Apply the exact mapping from Task 5 Step 3 to each remaining film, one at a time, gating each on the parity test. For films that have an "about the project" prose section, that prose moves into the file body as Markdown (verbatim, no rewording), rendered through the template `<slot />`.

Remaining slugs (each is one migration + parity-gate cycle):
`a-long-goodbye`, `anna`, `bearer-of-bad-news`, `bieke-depoorter-chance-encounters`, `burning-clouds`, `ever-since-i-have-been-flying`, `felix-le-gamin-qui-traverse`, `hoge-blekker`, `la-belle-rosine`, `les-homards-immortels`, `moonlight-woman`, `springtide`, `the-tears-of-things`, `today-we-escape`, `vlinderman`, `world-wood-web`.

Per-film mapping notes beyond Task 5:
- Films with `<ContentVimeo VimeoId title?>` map to `videos: [{ provider: "vimeo", id: VimeoId, title }]` (for example `bieke-depoorter-chance-encounters`, `les-homards-immortels`).
- Films with `<AwardItem award festival year>` map to the `awards` array (for example `a-long-goodbye`, `ever-since-i-have-been-flying`, `the-tears-of-things`).
- Films with multiple credits columns (the source splits credits into two `<div>` columns) concatenate both columns into one `credits` array in document order. The template lays them out, so the visual two-column split is reproduced by the existing component grid.
- Films whose prose has more than one labeled section: move all prose paragraphs into the body in order under simple Markdown. Section labels other than the standard blocks are preserved as Markdown headings in the body.

- [ ] **Step 1: Migrate one film and gate it**

For the next slug in the list: create `src/content/projects/<slug>.mdx` per the mapping, `git rm src/pages/projects/<slug>.mdx`, then:

Run: `npm test -- tests/parity.test.ts`
Expected: the new slug passes (counts equal baseline). Fix arrays until green.

- [ ] **Step 2: Build check for that film**

Run: `npm run build`
Expected: build succeeds and `/projects/<slug>/` builds. Spot-check the page in the dev server.

- [ ] **Step 3: Commit (local, no push)**

```bash
git add src/content/projects/<slug>.mdx
git rm src/pages/projects/<slug>.mdx
```
Commit message: `feat: migrate <slug> to projects collection`. Run `git commit` locally with this message. Do not push. Do not add any AI attribution or co-author trailer.

- [ ] **Step 4: Repeat Steps 1 to 3 for every remaining slug**

After the last one, confirm `src/pages/projects/` contains only `[slug].astro`:

Run: `ls src/pages/projects/`
Expected: only `[slug].astro`.

Run: `npm test -- tests/parity.test.ts`
Expected: all 17 films pass.

---

### Task 7: Generate the homepage grid from the collection

**Files:**
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `getCollection("projects")`, `sortByOrder`.

- [ ] **Step 1: Replace the hardcoded FilmCards**

Rewrite `src/pages/index.astro` to map the collection:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import FilmCard from "../components/FilmCard.astro";
import VideoCard from "../components/VideoCard.astro";
import { getCollection } from "astro:content";
import { sortByOrder } from "../lib/projects";

const all = await getCollection("projects");
const films = sortByOrder(all.map((e) => ({ slug: e.id, ...e.data.card, title: e.data.title })));
---

<BaseLayout title="Victor Maes — Cinematographer & Director | Brussels" description="Award-winning cinematographer and director Victor Maes. Portfolio of fiction films, documentaries, VR experiences and experimental work. Based in Brussels, available worldwide." image="/video/seethrough.jpg">
  <h1 class="sr-only">Victor Maes — Cinematographer</h1>
  <VideoCard />
  {films.map((f, i) => (
    <FilmCard
      title={f.title}
      img={f.image}
      imageposition={f.position}
      desc={`by ${all.find((e) => e.id === f.slug).data.director}`}
      url={`/projects/${f.slug}/`}
      badge1={f.badge1}
      badge2={f.badge2}
      target="_self"
      loading={i === 0 ? "eager" : "lazy"}
    />
  ))}
</BaseLayout>
```

Note: the original card `desc` is "by <director>". Confirm each migrated film's `director` reproduces the original `desc` text. Where the original `desc` differed (for example "by Kate Voet & Victor Maes"), the `director` field already holds that exact string, so it matches.

- [ ] **Step 2: Build and check homepage coverage**

Run: `npm run build`
Then: `for s in $(ls src/content/projects | sed 's/.mdx//'); do grep -q "/projects/$s/" dist/index.html || echo "MISSING $s"; done; echo done`
Expected: only `done` prints (every film is linked).

- [ ] **Step 3: Commit (local, no push)**

```bash
git add src/pages/index.astro
```
Commit message: `feat: generate homepage grid from projects collection`. Run `git commit` locally with this message. Do not push. Do not add any AI attribution or co-author trailer.

---

### Task 8: Full integration tests, order report, and cleanup

**Files:**
- Create: `tests/build.test.ts`
- Create: `scripts/migration/order-report.mjs`

**Interfaces:**
- Consumes: built `dist/`.

- [ ] **Step 1: Write the build-and-check integration test**

Create `tests/build.test.ts`. It asserts against the already-built `dist/` (run `npm run build` before `npm test`).

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";

const slugs = readdirSync("src/content/projects").filter((f) => f.endsWith(".mdx")).map((f) => f.replace(/\.mdx$/, ""));
const home = "dist/index.html";

describe("built site invariants", () => {
  beforeAll(() => {
    if (!existsSync(home)) throw new Error("Run `npm run build` before the build tests.");
  });

  it("homepage links every film", () => {
    const html = readFileSync(home, "utf-8");
    for (const s of slugs) expect(html).toContain(`/projects/${s}/`);
  });

  for (const s of slugs) {
    it(`${s} page exists, is non-empty, and links a next film`, () => {
      const file = `dist/projects/${s}/index.html`;
      expect(existsSync(file)).toBe(true);
      const html = readFileSync(file, "utf-8");
      expect(html.length).toBeGreaterThan(1000);
      const nextLinks = [...html.matchAll(/\/projects\/([a-z0-9-]+)\//g)].map((m) => m[1]);
      const others = nextLinks.filter((x) => x !== s);
      expect(others.length).toBeGreaterThan(0);
      for (const o of others) expect(slugs).toContain(o);
    });
  }
});
```

- [ ] **Step 2: Run the full suite against a fresh build**

Run: `npm run build && npm test`
Expected: all suites pass (smoke, projects, schema, parity for 17, build invariants for 17).

- [ ] **Step 3: Generate the before/after order report**

Create `scripts/migration/order-report.mjs` that prints, per film, the old next-project target (from git history of the old pages) versus the new derived next, and the old vs new section order. Minimum viable version: list each film's new next-project target and new block order so MrMochi can eyeball changes.

```js
import { readdirSync, readFileSync } from "node:fs";
import { parse } from "yaml";

const DIR = "src/content/projects";
const films = readdirSync(DIR).filter((f) => f.endsWith(".mdx")).map((f) => {
  const text = readFileSync(`${DIR}/${f}`, "utf-8");
  const data = parse(text.match(/^---\n([\s\S]*?)\n---/)[1]);
  return { slug: f.replace(/\.mdx$/, ""), order: data.card.order };
});
films.sort((a, b) => a.order - b.order);
films.forEach((f, i) => {
  const next = films[(i + 1) % films.length];
  console.log(`${f.order}. ${f.slug}  ->  next: ${next.slug}`);
});
```

Run: `node scripts/migration/order-report.mjs`
Share the output with MrMochi for sign-off on the next-project ordering.

- [ ] **Step 4: Confirm no dead references remain**

Run: `grep -rn "pages/projects" src/ || echo clean`
Expected: only the `[slug].astro` route references remain. No imports of deleted pages.

- [ ] **Step 5: Commit (local, no push)**

```bash
git add tests/build.test.ts scripts/migration/order-report.mjs
```
Commit message: `test: add build invariants and order report`. Run `git commit` locally with this message. Do not push. Do not add any AI attribution or co-author trailer.

---

## Self-Review

Spec coverage:
- Data model (spec 3): Task 4 schema. Covered.
- File layout and routing (spec 4): Task 5 route and collection dir. Covered.
- Homepage and next-project (spec 5): Task 7 homepage, Task 3 plus Task 5 next derivation. Covered.
- Canonical order (spec 6): Task 5 template. Order report in Task 8. Covered.
- URL preservation (spec 7): slug equals filename, Task 8 build test asserts each URL. Covered.
- Testing four layers (spec 8): schema (Task 4), build-and-check (Task 8), unit (Task 3), parity (Task 5 plus Task 6). Covered.
- Phased migration (spec 9): Tasks 5 to 7. Covered.
- Sequencing and git (spec 10): Global Constraints (local commits per task on master, no push, no AI attribution trailer). Covered.

Placeholder scan: the only intentional "fill in" is the bulk gallery and credits array entries in Task 5 Step 3 and Task 6, which are mechanical data entry gated by the parity test. All logic and test code is complete.

Type consistency: `sortByOrder` and `nextSlug` signatures match between Task 3 definition and Task 5 use. `entry.id` is the slug under the glob loader. `projectSchema` exported name is consistent between Task 4 and `tests/schema.test.ts`.

Open risk to watch during execution: the `astro:content` virtual module import inside a plain Vitest run. Task 4 Step 3 mitigates by putting the schema in a standalone `src/lib/project-schema.ts` importing `zod` directly. Parity and build tests avoid `astro:content` by reading files and `dist` directly.
```
