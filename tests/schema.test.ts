import { describe, it, expect } from "vitest";
import { projectSchema } from "../src/lib/project-schema";

const valid = {
  title: "Burn",
  seoTitle: "Burn — Fiction Short Film | Cinematography by MrMochi",
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
    const bad: Partial<typeof valid> = { ...valid };
    delete bad.synopsis;
    expect(() => projectSchema.parse(bad)).toThrow();
  });
  it("rejects a non-numeric card order", () => {
    const bad = { ...valid, card: { ...valid.card, order: "first" } };
    expect(() => projectSchema.parse(bad)).toThrow();
  });
  it.each(["title", "seoTitle", "description", "director", "genre", "format", "role", "synopsis"])("rejects blank %s", (field) => {
    expect(projectSchema.safeParse({ ...valid, [field]: "  " }).success).toBe(false);
  });
  it.each([0, -1, 1.5])("rejects invalid order %s", (order) => {
    expect(projectSchema.safeParse({ ...valid, card: { ...valid.card, order } }).success).toBe(false);
  });
  it.each(["", "23", "2023-01-01", "unknown", "0000"])("rejects invalid year %s", (year) => {
    expect(projectSchema.safeParse({ ...valid, year }).success).toBe(false);
  });
  it("allows an unknown year and intentionally blank group labels", () => {
    const parsed = projectSchema.parse({ ...valid, year: undefined, card: { ...valid.card, badge2: "" }, credits: [{ function: "", name: "MrMochi" }], specs: [{ label: "", value: "Digital" }] });
    expect(parsed.year).toBeUndefined();
  });
  it.each([
    { provider: "youtube", id: "https://youtu.be/abcdefghijk" },
    { provider: "youtube", id: "short" },
    { provider: "vimeo", id: "abc" },
    { provider: "vimeo", id: "0" },
    { provider: "other", id: "123" },
  ])("rejects malformed video $provider/$id", (video) => {
    expect(projectSchema.safeParse({ ...valid, videos: [video] }).success).toBe(false);
  });
  it("accepts provider-specific IDs", () => {
    expect(projectSchema.parse({ ...valid, videos: [{ provider: "youtube", id: "Abc_def-123" }, { provider: "vimeo", id: "123456" }] }).videos).toHaveLength(2);
  });
  it.each([{ caption: "A photo" }, { image: "/img/photo.jpg", caption: "A photo" }, { image: "/img/photo.jpg", alt: " " }])("rejects an incomplete gallery image %#", (image) => {
    expect(projectSchema.safeParse({ ...valid, gallery: [image] }).success).toBe(false);
  });
  it.each([{ image: "/img/photo.jpg" }, { imageAlt: "A ceremony" }, { caption: "A ceremony" }])("rejects incomplete award image text %#", (image) => {
    expect(projectSchema.safeParse({ ...valid, featuredAward: { award: "Best film", festival: "Film festival", ...image } }).success).toBe(false);
  });
});
