// Builds an isolated native-navigation experiment; never edits production sources.
// node scripts/prototype-native-navigation.mjs /tmp/portfolio-native-prototype
import { cpSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, existsSync, realpathSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';

let root = resolve(process.argv[2] ?? '/tmp/portfolio-native-prototype');
if (existsSync(root)) throw new Error('Choose a new prototype directory.');
mkdirSync(root, { recursive: true });
root = realpathSync(root);
for (const path of ['src', 'scripts', 'public', 'package.json', 'tsconfig.json', 'astro.config.mjs']) {
  cpSync(path, join(root, path), { recursive: true, filter: (source) => !/src\/assets(?:\/|$)/.test(source) });
}
symlinkSync(resolve('src/assets'), join(root, 'src/assets'), 'dir');
symlinkSync(resolve('node_modules'), join(root, 'node_modules'), 'dir');
const edit = (path, transform) => writeFileSync(join(root, path), transform(readFileSync(join(root, path), 'utf8')));
edit('astro.config.mjs', (source) => source.replace('site: SITE_URL,', "site: SITE_URL, cacheDir: './.cache/',"));
edit('src/layouts/BaseLayout.astro', (source) => source
  .replace("import { ClientRouter } from 'astro:transitions';", '')
  .replace('<ClientRouter />', '')
  .replace('<Header transition:animate="none" />', '<Header />')
  .replace("document.addEventListener('astro:page-load',", "document.addEventListener('DOMContentLoaded',")
  .replace('<style is:global>', '<style is:global>\n@view-transition { navigation: auto; }\n@media (prefers-reduced-motion: reduce) { @view-transition { navigation: none; } }'));
for (const path of ['src/components/FilmCard.astro', 'src/components/ProjectHero.astro']) {
  edit(path, (source) => source.replace('transition:name={`hero-${slug}`}', 'style={`view-transition-name: hero-${slug}`}').replace('transition:animate="slide"', ''));
}
edit('src/components/Header.astro', (source) => source.replaceAll("'astro:page-load'", "'pageshow'").replaceAll("document.addEventListener('pageshow'", "window.addEventListener('pageshow'").replaceAll("document.removeEventListener('pageshow'", "window.removeEventListener('pageshow'"));
for (const path of ['src/lib/lightbox.ts', 'src/lib/work-filters.ts', 'src/components/VideoEmbed.astro', 'src/components/VideoCard.astro']) {
  edit(path, (source) => source
    .replaceAll("'astro:page-load'", "'DOMContentLoaded'")
    .replaceAll("'astro:before-swap'", "'pagehide'")
    .replaceAll('"astro:before-swap"', '"pagehide"')
    .replaceAll("document.addEventListener('pagehide'", "window.addEventListener('pagehide'")
    .replaceAll('document.addEventListener("pagehide"', 'window.addEventListener("pagehide"')
    + (path.endsWith('.ts') ? '\nwindow.addEventListener("pageshow", (event) => { if (event.persisted) setup(); });\n' : ''));
}
// Analytics already handles pageshow, with per-document deduplication.
edit('src/components/Analytics.astro', (source) => source.replace("document.addEventListener('astro:page-load', enableAnalytics);", ''));
console.log(`Building isolated native prototype in ${root}`);
const astro = JSON.parse(readFileSync('node_modules/astro/package.json', 'utf8'));
execFileSync(process.execPath, [resolve('node_modules/astro', astro.bin.astro), 'build', '--root', root], { stdio: 'inherit' });
