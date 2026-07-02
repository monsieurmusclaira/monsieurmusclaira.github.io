import type { ImageMetadata } from 'astro';

const images = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/img/**/*.{png,PNG,jpg,JPG,jpeg,JPEG,webp,WEBP,gif,GIF,svg,SVG}',
  { eager: true }
);

export function resolveImage(path: string): ImageMetadata {
  const key = `/src/assets${path}`;
  const mod = images[key];
  if (!mod) {
    throw new Error(`Image not found: "${path}" (resolved to "${key}")`);
  }
  return mod.default;
}

/** All behind-the-scenes photos, up to `perFolder` from each film's bts folder. */
export function listBtsImages(perFolder = 5): ImageMetadata[] {
  const byFolder = new Map<string, ImageMetadata[]>();
  for (const [key, mod] of Object.entries(images)) {
    const match = key.match(/^\/src\/assets\/img\/([^/]+)\/bts\//);
    if (!match) continue;
    const list = byFolder.get(match[1]) ?? [];
    list.push(mod.default);
    byFolder.set(match[1], list);
  }
  return [...byFolder.values()].flatMap((list) => list.slice(0, perFolder));
}
