import type { ImageMetadata } from 'astro';

import { images, btsGalleryPaths } from '../../.astro/image-manifest';
const loaded = new Map<string, Promise<{ default: ImageMetadata }>>();

export function importImage(path: string): Promise<{ default: ImageMetadata }> {
  const loader = images[path];
  if (!loader) throw new Error(`Image not found: "${path}". Use a literal source path or project frontmatter so it enters the image manifest.`);
  let image = loaded.get(path);
  if (!image) {
    image = loader();
    loaded.set(path, image);
  }
  return image;
}

export async function resolveImage(path: string): Promise<ImageMetadata> {
  return (await importImage(path)).default;
}

/** Representative photos from the visible board, in its editorial order. */
export async function listBtsImages(perFolder = 5): Promise<ImageMetadata[]> {
  const counts = new Map<string, number>();
  const selected = btsGalleryPaths.filter((path) => {
    const folder = path.split('/')[2];
    const count = counts.get(folder) ?? 0;
    counts.set(folder, count + 1);
    return count < perFolder;
  });
  return Promise.all(selected.map(resolveImage));
}
