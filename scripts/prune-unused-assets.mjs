// Removes image files from dist/_astro that no built HTML/CSS/JS/XML references.
// Astro's eager image glob (src/utils/images.ts) causes every original
// PNG/JPG to be emitted alongside the optimized WebP variants the pages
// actually use. Those originals add ~800MB to the deploy, which overruns
// GitHub Pages' 1GB site limit. Run after `astro build`.
import { readdir, readFile, unlink, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const ASTRO_DIR = join(DIST, '_astro');
const PRUNABLE = new Set(['.png', '.jpg', '.jpeg', '.webp', '.PNG', '.JPG', '.JPEG', '.WEBP']);

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

// Gather every reference-bearing text file in dist
let haystack = '';
for await (const path of walk(DIST)) {
  const ext = extname(path).toLowerCase();
  if (['.html', '.css', '.js', '.mjs', '.json', '.xml', '.txt'].includes(ext)) {
    haystack += await readFile(path, 'utf-8');
  }
}

let removed = 0;
let freed = 0;
for await (const path of walk(ASTRO_DIR)) {
  if (!PRUNABLE.has(extname(path))) continue;
  const filename = path.slice(path.lastIndexOf('/') + 1);
  if (!haystack.includes(filename)) {
    const { size } = await stat(path);
    await unlink(path);
    removed += 1;
    freed += size;
  }
}

console.log(`[prune-unused-assets] removed ${removed} unreferenced originals, freed ${(freed / 1024 / 1024).toFixed(0)} MB`);
