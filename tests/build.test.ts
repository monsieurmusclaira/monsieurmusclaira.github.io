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
