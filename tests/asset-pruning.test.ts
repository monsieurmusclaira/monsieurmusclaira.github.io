import { it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

it('pruning retains Picture source candidates and removes unused AVIF variants', () => {
  const root = mkdtempSync(join(tmpdir(), 'portfolio-picture-pruning-'));
  try {
    mkdirSync(join(root, '_astro'));
    for (const name of ['portrait-320.avif', 'portrait-640.avif', 'portrait.webp', 'unused.avif']) {
      writeFileSync(join(root, '_astro', name), 'image fixture');
    }
    writeFileSync(join(root, 'index.html'), '<picture><source type="image/avif" srcset="/_astro/portrait-320.avif 320w, /_astro/portrait-640.avif 640w"><img src="/_astro/portrait.webp" alt="Portrait"></picture>');
    execFileSync(process.execPath, [resolve('scripts/prune-unused-assets.mjs'), root]);
    expect(existsSync(join(root, '_astro/portrait-320.avif'))).toBe(true);
    expect(existsSync(join(root, '_astro/portrait-640.avif'))).toBe(true);
    expect(existsSync(join(root, '_astro/portrait.webp'))).toBe(true);
    expect(existsSync(join(root, '_astro/unused.avif'))).toBe(false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
