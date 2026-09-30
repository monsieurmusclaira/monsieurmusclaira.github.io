// Removes image files from dist/_astro that no built HTML/CSS/JS/XML references.
// Vite emits imported originals alongside optimized variants, including lazy
// imports. Keep pruning until the manifest no longer emits those unused files.
import { readdir, readFile, unlink, stat } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = process.argv[2] ? resolve(process.argv[2]) : fileURLToPath(new URL('../dist/', import.meta.url));
const ASTRO_DIR = join(DIST, '_astro');
const PRUNABLE = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.PNG', '.JPG', '.JPEG', '.WEBP', '.SVG']);

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

// Gather every reference-bearing text file in dist. HTML/CSS/JSON carry
// percent-encoded URLs (a source file named "cover (1).jpg" ships as
// "cover%20(1)…"), so decode each file before matching raw disk filenames.
// decodeURIComponent throws on lone `%`, so fall back to the raw text.
function decode(text) {
  return text.replace(/(?:%[0-9A-Fa-f]{2})+/g, (seq) => {
    try {
      return decodeURIComponent(seq);
    } catch {
      return seq;
    }
  });
}

let haystack = '';
for await (const path of walk(DIST)) {
  const ext = extname(path).toLowerCase();
  if (['.html', '.css', '.js', '.mjs', '.json', '.xml', '.txt'].includes(ext)) {
    const text = await readFile(path, 'utf-8');
    haystack += text;
    const decoded = decode(text);
    if (decoded !== text) haystack += decoded;
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
