import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { sortByOrder, nextSlug, prevSlug, validateProjectOrder, requireProject } from "../src/lib/projects";

const sample = [
  { slug: "c", order: 3 },
  { slug: "a", order: 1 },
  { slug: "b", order: 2 },
];

it('home cards, filmography and next links share one sequence', () => {
  const home = readFileSync('dist/index.html', 'utf8');
  const featured = [...home.matchAll(/<a\b[^>]*>/g)].filter(([tag]) => tag.includes('featured-film')).map(([tag]) => tag.match(/href="([^"]+)"/)![1]);
  const filmography = [...home.match(/<ul id="work-list"[^>]*>([\s\S]*?)<\/ul>/)![1].matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(([, href]) => href);
  expect(featured).toEqual(filmography.slice(0, 8));
  for (const [index, href] of featured.slice(0, -1).entries()) {
    const html = readFileSync(`dist${href}index.html`, 'utf8');
    const next = [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].find(([anchor]) => anchor.includes('Next project'))![0];
    expect(next.match(/href="([^"]+)"/)![1], href).toBe(featured[index + 1]);
  }
});

describe("sortByOrder", () => {
  it("sorts ascending by order without mutating input", () => {
    const out = sortByOrder(sample);
    expect(out.map((x) => x.slug)).toEqual(["a", "b", "c"]);
    expect(sample[0].slug).toBe("c");
  });
});

describe("project sequence validation", () => {
  it("accepts unique orders", () => expect(() => validateProjectOrder(sample)).not.toThrow());
  it("rejects an empty collection with a useful message", () => expect(() => validateProjectOrder([])).toThrow("at least one project"));
  it("names both projects sharing an order", () => expect(() => validateProjectOrder([{ slug: "a", order: 1 }, { slug: "b", order: 1 }])).toThrow('Duplicate card order 1: "a" and "b"'));
  it("returns an existing adjacent entry", () => expect(requireProject([{ id: "a" }], "a")).toEqual({ id: "a" }));
  it("fails clearly for a missing adjacent entry", () => expect(() => requireProject([{ id: "a" }], "missing")).toThrow('Missing adjacent project entry: "missing"'));
  it("wraps previous navigation from first to last", () => expect(prevSlug("a", sortByOrder(sample))).toBe("c"));
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
