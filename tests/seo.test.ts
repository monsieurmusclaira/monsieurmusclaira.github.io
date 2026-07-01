import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";

const home = "dist/index.html";
const projectSlugs = readdirSync("src/content/projects")
  .filter((f) => f.endsWith(".mdx"))
  .map((f) => f.replace(/\.mdx$/, ""));

function html(path: string) {
  return readFileSync(path, "utf-8");
}

// Pull every JSON-LD block out of a built page and flatten to a list of entities.
function jsonLd(pageHtml: string): any[] {
  const blocks = [...pageHtml.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  )];
  const out: any[] = [];
  for (const b of blocks) {
    const parsed = JSON.parse(b[1]);
    if (Array.isArray(parsed)) out.push(...parsed);
    else out.push(parsed);
  }
  return out;
}

describe("built-site SEO invariants", () => {
  beforeAll(() => {
    if (!existsSync(home)) throw new Error("Run `npm run build` before the SEO tests.");
  });

  it("ships no third-party unpkg reference (AOS is self-hosted)", () => {
    for (const s of projectSlugs) {
      expect(html(`dist/projects/${s}/index.html`)).not.toContain("unpkg");
    }
    expect(html(home)).not.toContain("unpkg");
  });

  it("home Person schema declares knowsLanguage", () => {
    const person = jsonLd(html(home)).find((e) => e["@type"] === "Person");
    expect(person).toBeDefined();
    expect(person.knowsLanguage).toEqual(["en", "fr", "nl"]);
  });

  it("home og:type is website, project og:type is video.other", () => {
    expect(html(home)).toContain('<meta property="og:type" content="website"');
    for (const s of projectSlugs) {
      expect(html(`dist/projects/${s}/index.html`)).toContain(
        '<meta property="og:type" content="video.other"',
      );
    }
  });

  it("the interactive VR piece renders as CreativeWork, others as Movie", () => {
    const vr = jsonLd(html("dist/projects/a-long-goodbye/index.html"));
    expect(vr.some((e) => e["@type"] === "CreativeWork")).toBe(true);
    expect(vr.some((e) => e["@type"] === "Movie")).toBe(false);

    const burn = jsonLd(html("dist/projects/burn/index.html"));
    expect(burn.some((e) => e["@type"] === "Movie")).toBe(true);
  });

  it("award lists in structured data contain no duplicates", () => {
    for (const s of projectSlugs) {
      const work = jsonLd(html(`dist/projects/${s}/index.html`)).find(
        (e) => Array.isArray(e.award),
      );
      if (!work) continue;
      expect(new Set(work.award).size).toBe(work.award.length);
    }
  });

  it("project trailer heading is an h2, never a skipped-level h3", () => {
    for (const s of projectSlugs) {
      const page = html(`dist/projects/${s}/index.html`);
      expect(page).not.toMatch(/<h3[^>]*>\s*Trailer\s*<\/h3>/);
    }
  });

  it("hero video defers its download (preload none, sources gated behind data-src)", () => {
    const page = html(home);
    expect(page).toContain('preload="none"');
    expect(page).toContain('data-src="/video/SeeThrough_VP9_VBR.webm"');
    expect(page).toContain('poster="/video/seethrough.jpg"');
    // The heavy sources must NOT be eagerly wired via a plain src on the source tags.
    expect(page).not.toMatch(/<source[^>]*\ssrc="\/video\//);
  });
});
