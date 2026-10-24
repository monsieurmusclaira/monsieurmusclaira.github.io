import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const output = process.argv[2];
const baseURL = process.argv[3] ?? 'http://127.0.0.1:4323';
if (!output || !['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname)) throw new Error('Provide an output directory and local preview.');
mkdirSync(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const width of [390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    await page.route('**/*', (route) => new URL(route.request().url()).origin === new URL(baseURL).origin ? route.continue() : route.abort());
    await page.goto(`${baseURL}/about/`);
    await page.evaluate(() => document.fonts.ready);
    const hero = page.locator('main img').first();
    const portrait = page.getByAltText('Portrait of Victor Maes, cinematographer and director based in Belgium');
    const inspect = (image) => image.evaluate(async (el) => {
      await el.decode();
      const start = performance.now();
      const bitmap = await createImageBitmap(el);
      const bitmapCreationMilliseconds = performance.now() - start;
      bitmap.close();
      return { src: el.currentSrc, srcset: el.srcset, sizes: el.sizes, loading: el.loading, layout: el.dataset.astroImage, rect: el.getBoundingClientRect().toJSON(), objectFit: getComputedStyle(el).objectFit, bitmapCreationMilliseconds, picture: el.parentElement.tagName === 'PICTURE' ? el.parentElement.outerHTML : null };
    });
    await page.screenshot({ path: join(output, `hero-${width}.png`) });
    const heroData = await inspect(hero);
    await portrait.scrollIntoViewIfNeeded();
    const portraitData = await inspect(portrait);
    await page.screenshot({ path: join(output, `portrait-${width}.png`) });
    results.push({ width, hero: heroData, portrait: portraitData });
    await page.close();
  }
} finally { await browser.close(); }
writeFileSync(join(output, 'layout.json'), `${JSON.stringify(results, null, 2)}\n`);
