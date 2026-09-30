import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const extension = /\.(png|jpe?g|webp|gif|svg)$/i;
const literal = /["'](\/img\/[^"'\r\n]+\.(?:png|jpe?g|webp|gif|svg))["']/gi;

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);
}

export function generateImageManifest(root) {
  const paths = new Set();
  const collect = (value) => {
    if (typeof value === 'string' && value.startsWith('/img/') && extension.test(value)) paths.add(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === 'object') Object.values(value).forEach(collect);
  };
  for (const file of walk(join(root, 'src')).filter((file) => /\.(astro|mdx|ts)$/.test(file))) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(literal)) paths.add(match[1]);
    if (file.endsWith('.mdx')) {
      const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (frontmatter) collect(parse(frontmatter[1]));
    }
  }
  const btsSource = readFileSync(join(root, 'src/pages/behind-the-scenes.mdx'), 'utf8');
  const btsPaths = [...btsSource.matchAll(/<Polaroid\b[^>]*\bimage=["']([^"']+)["']/g)].map((match) => match[1]);
  if (btsPaths.length !== [...btsSource.matchAll(/<Polaroid\b/g)].length) throw new Error('BTS image metadata needs a literal image path for each visible Polaroid.');
  for (const path of paths) {
    if (path.split('/').includes('..') || !existsSync(join(root, 'src/assets', path))) throw new Error(`Referenced image not found: ${path}`);
  }
  const entries = [...paths].sort().map((path) => `/src/assets${path}`);
  const output = `// Generated from referenced source images; do not edit.\nimport type { ImageMetadata } from 'astro';\nconst referenced = import.meta.glob<{ default: ImageMetadata }>(${JSON.stringify(entries)});\nexport const images: Record<string, () => Promise<{ default: ImageMetadata }>> = Object.fromEntries(Object.entries(referenced).map(([key, loader]) => [key.replace('/src/assets', ''), loader]));\nexport const btsGalleryPaths: string[] = ${JSON.stringify(btsPaths)};\n`;
  const target = join(root, '.astro/image-manifest.ts');
  mkdirSync(join(root, '.astro'), { recursive: true });
  if (!existsSync(target) || readFileSync(target, 'utf8') !== output) writeFileSync(target, output);
  return paths.size;
}

export default function portfolioImages() {
  let root;
  return {
    name: 'portfolio-image-manifest',
    hooks: {
      'astro:config:setup': ({ config, logger }) => {
        root = fileURLToPath(config.root);
        logger.info(`Including ${generateImageManifest(root)} referenced images.`);
      },
      'astro:server:setup': ({ server }) => {
        let timer;
        const update = (file) => {
          if (!file.startsWith(join(root, 'src')) || !/\.(astro|mdx|ts)$/.test(file)) return;
          clearTimeout(timer);
          timer = setTimeout(() => generateImageManifest(root), 50);
        };
        server.watcher.on('add', update).on('change', update).on('unlink', update);
      },
    },
  };
}
