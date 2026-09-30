import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateImageManifest } from '../scripts/image-manifest.mjs';

function fixture(run: (root: string) => void) {
  const root = mkdtempSync(join(tmpdir(), 'portfolio-images-'));
  mkdirSync(join(root, 'src/pages'), { recursive: true });
  mkdirSync(join(root, 'src/content/projects'), { recursive: true });
  mkdirSync(join(root, 'src/assets/img'), { recursive: true });
  writeFileSync(join(root, 'src/pages/behind-the-scenes.mdx'), '<Polaroid image="/img/board.webp" />');
  writeFileSync(join(root, 'src/assets/img/board.webp'), 'fixture');
  try { run(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

describe('referenced image manifest', () => {
  it('includes literal and unquoted frontmatter paths while excluding unused assets', () => fixture((root) => {
    writeFileSync(join(root, 'src/content/projects/film.mdx'), '---\nhero:\n  image: /img/still.webp\n---');
    writeFileSync(join(root, 'src/assets/img/still.webp'), 'fixture');
    writeFileSync(join(root, 'src/assets/img/unused.webp'), 'fixture');
    expect(generateImageManifest(root)).toBe(2);
    const manifest = readFileSync(join(root, '.astro/image-manifest.ts'), 'utf8');
    expect(manifest).toContain('/img/still.webp');
    expect(manifest).not.toContain('unused.webp');
    expect(manifest).toContain('btsGalleryPaths: string[] = ["/img/board.webp"]');
  }));
  it('fails with the referenced path when an image is missing', () => fixture((root) => {
    writeFileSync(join(root, 'src/pages/home.astro'), 'resolveImage("/img/missing.webp")');
    expect(() => generateImageManifest(root)).toThrow('Referenced image not found: /img/missing.webp');
  }));
  it('rejects a BTS photo that cannot enter visible-board metadata', () => fixture((root) => {
    writeFileSync(join(root, 'src/pages/behind-the-scenes.mdx'), '<Polaroid image={unknown} />');
    expect(() => generateImageManifest(root)).toThrow('literal image path');
  }));
});
