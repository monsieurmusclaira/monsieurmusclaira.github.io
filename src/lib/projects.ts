export type ProjectCard = {
  slug: string;
  order: number;
  title: string;
  image: string;
  position: string;
  badge1: string;
  badge2: string;
};

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
