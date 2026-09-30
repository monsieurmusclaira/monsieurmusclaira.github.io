import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const publicImages: Record<string, { width: number; height: number }> = {
  '/video/seethrough.jpg': { width: 1800, height: 800 },
};

/** Public assets are explicit; a failed managed import must never become a URL. */
export function publicSocialImage(path: string) {
  if (path.startsWith('/img/')) return undefined;
  const dimensions = publicImages[path];
  if (!dimensions || !existsSync(resolve('public', path.slice(1)))) {
    throw new Error(`Missing or unregistered public social image: ${path}`);
  }
  return dimensions;
}
