import type { CollectionEntry } from "astro:content";

export type ProjectEntry = CollectionEntry<"projects">;
export type ProjectData = ProjectEntry["data"];
export type ProjectCard = ProjectData["card"] & { slug: string; title: string };
export type ProjectLink = { title: string; url: string };
export type NextProjectLink = ProjectLink & { image: string; position: string };
export type IntroFact = { label: string; value: string };

/** The collection schema validates each order; this checks the whole sequence. */
export function validateProjectOrder(projects: readonly { slug: string; order: number }[]) {
  if (!projects.length) throw new Error("The projects collection must contain at least one project.");
  const orders = new Map<number, string>();
  for (const project of projects) {
    const existing = orders.get(project.order);
    if (existing !== undefined) throw new Error(`Duplicate card order ${project.order}: "${existing}" and "${project.slug}".`);
    orders.set(project.order, project.slug);
  }
}

export function requireProject<T extends { id: string }>(projects: readonly T[], slug: string): T {
  const entry = projects.find((project) => project.id === slug);
  if (!entry) throw new Error(`Missing adjacent project entry: "${slug}". Check the project sequence.`);
  return entry;
}

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

export function prevSlug(
  slug: string,
  ordered: { slug: string; order: number }[],
): string {
  const index = ordered.findIndex((p) => p.slug === slug);
  if (index === -1) throw new Error(`Unknown project slug: ${slug}`);
  const prev = ordered[(index - 1 + ordered.length) % ordered.length];
  return prev.slug;
}
