import { describe, it, expect } from "vitest";
import { projectSchema } from "../src/lib/project-schema";

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
    delete (bad as any).synopsis;
    expect(() => projectSchema.parse(bad)).toThrow();
  });
  it("rejects a non-numeric card order", () => {
    const bad = { ...valid, card: { ...valid.card, order: "first" } };
    expect(() => projectSchema.parse(bad)).toThrow();
  });
});
