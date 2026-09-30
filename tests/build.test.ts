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

  it("project editorial copy is wrapped for readable dark-theme styling", () => {
    const html = readFileSync("dist/projects/a-long-goodbye/index.html", "utf-8");
    expect(html).toContain('<div class="project-copy">');
    expect(html).toContain("co-written and co-directed by Kate Voet");
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

  // Each department is one semantic group: a visible term paired with a list
  // of names. This prevents continuation names from slipping into the label
  // column when CSS Grid auto-placement runs.
  it("credits columns preserve labelled department groups", () => {
    const columnRe =
      /<dl data-credit-column class="[^"]*">([\s\S]*?)<\/dl>/g;
    let checked = 0;
    for (const s of slugs) {
      const html = readFileSync(`dist/projects/${s}/index.html`, "utf-8");
      for (const m of html.matchAll(columnRe)) {
        const column = m[1].trim();
        if (!column) continue;
        checked++;
        const groups = [...column.matchAll(
          /<div data-credit-group class="[^"]*">([\s\S]*?)<\/div>/g,
        )];
        expect(groups.length).toBeGreaterThan(0);
        for (const group of groups) {
          expect(group[1].match(/<dt\b/g) ?? []).toHaveLength(1);
          expect(group[1].match(/<dd\b/g) ?? []).toHaveLength(1);
          expect(group[1].match(/<li\b/g)?.length ?? 0).toBeGreaterThan(0);
          expect(group[1]).not.toMatch(/\bsr-only\b/);
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("specs preserve labelled groups with consistently aligned values", () => {
    let checked = 0;
    for (const s of slugs) {
      const html = readFileSync(`dist/projects/${s}/index.html`, "utf-8");
      const list = html.match(
        /<dl id="specs" data-spec-list class="[^"]*"[^>]*>([\s\S]*?)<\/dl>/,
      );
      if (!list) continue;
      checked++;
      const groups = [...list[1].matchAll(
        /<div data-spec-group class="[^"]*">([\s\S]*?)<\/div>/g,
      )];
      expect(groups.length).toBeGreaterThan(0);
      for (const group of groups) {
        expect(group[1].match(/<dt\b/g) ?? []).toHaveLength(1);
        expect(group[1].match(/<dd\b/g) ?? []).toHaveLength(1);
        expect(group[1].match(/<li\b/g)?.length ?? 0).toBeGreaterThan(0);
        expect(group[1]).not.toMatch(/\bsr-only\b/);
      }
    }
    expect(checked).toBe(3);
  });

  it("YouTube trailers use a centered player-width frame", () => {
    for (const slug of ["burn", "ever-since-i-have-been-flying"]) {
      const html = readFileSync(`dist/projects/${slug}/index.html`, "utf-8");
      expect(html).toMatch(/data-youtube-frame(?:="true")? class="w-full max-w-\[720px\] mx-auto overflow-hidden"/);
    }
  });

  it("lightboxes expose names and triggers reference existing dialogs", () => {
    const pages = [
      "dist/behind-the-scenes/index.html",
      ...slugs.map((s) => `dist/projects/${s}/index.html`),
    ];
    let checked = 0;
    for (const file of pages) {
      const html = readFileSync(file, "utf-8");
      expect([...html.matchAll(/<dialog\b/g)], file).toHaveLength(1);
      for (const match of html.matchAll(/<dialog\b[^>]*class="lightbox"[^>]*>/g)) {
        checked++;
        expect(match[0]).toMatch(/aria-label="[^"]+"/);
      }
      const dialogIds = new Set([...html.matchAll(/<dialog\b[^>]*id="([^"]+)"/g)].map((match) => match[1]));
      const triggerIds = [...html.matchAll(/<a\b[^>]*id="(gallery-trigger-[^"]+)"/g)].map((match) => match[1]);
      expect(new Set(triggerIds).size, file).toBe(triggerIds.length);
      for (const match of html.matchAll(/data-lightbox-id="([^"]+)"/g)) {
        expect(dialogIds.has(match[1]), `${file}: missing dialog ${match[1]}`).toBe(true);
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});
