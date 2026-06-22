import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import baseline from "./fixtures/parity-baseline.json";

const DIR = "src/content/projects";

function loadData(slug: string) {
  const text = readFileSync(join(DIR, `${slug}.mdx`), "utf-8");
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) throw new Error(`No frontmatter in ${slug}.mdx`);
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
      const listsItems = (data.lists || []).reduce((n, l) => n + (l.items ? l.items.length : 0), 0);
      expect(listsItems).toBe(base.listsItemsTotal);
      expect((data.laurels || []).length).toBe(base.laurels);
      expect((data.videos || []).length).toBe(base.videos);
    });
  }
});
