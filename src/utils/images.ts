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
