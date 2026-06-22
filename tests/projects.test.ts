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
