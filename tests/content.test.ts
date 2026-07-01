import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

const DIR = "src/content/projects";

function loadData(slug: string) {
  const text = readFileSync(join(DIR, `${slug}.mdx`), "utf-8");
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) throw new Error(`No frontmatter in ${slug}.mdx`);
  return parse(fm[1]);
}

const slugs = readdirSync(DIR)
  .filter((f) => f.endsWith(".mdx"))
  .map((f) => f.replace(/\.mdx$/, ""));

describe("project frontmatter SEO invariants", () => {
  for (const slug of slugs) {
    const data = loadData(slug);

    it(`${slug} meta description fits the ~160 char search snippet`, () => {
      expect(data.description.length).toBeGreaterThan(0);
      expect(data.description.length).toBeLessThanOrEqual(160);
    });

    it(`${slug} has a non-empty seoTitle and hero alt text`, () => {
      expect(data.seoTitle.length).toBeGreaterThan(0);
      expect(data.hero.alt.length).toBeGreaterThan(0);
    });

    it(`${slug} gallery and laurel images all carry alt text`, () => {
      for (const g of data.gallery || []) expect(g.alt.length).toBeGreaterThan(0);
      for (const l of data.laurels || []) expect(l.alt.length).toBeGreaterThan(0);
    });
  }

  it("the interactive VR piece is typed as CreativeWork, not Movie", () => {
    expect(loadData("a-long-goodbye").schemaType).toBe("CreativeWork");
  });
});
