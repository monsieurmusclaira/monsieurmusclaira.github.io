// Repeatable local image-transfer comparison; run against a production preview.
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const baseURL = process.env.PORTFOLIO_MEASURE_URL ?? 'http://127.0.0.1:4321';
const output = process.argv[2];
if (!output) throw new Error('Provide an output JSON path.');
const browser = await chromium.launch();
const results = [];
try {
  for (const [width, height, deviceScaleFactor] of [[1280, 720, 1], [1280, 720, 2], [390, 844, 2]]) {
    for (const route of ['/projects/bieke-depoorter-chance-encounters/', '/projects/ever-since-i-have-been-flying/', '/behind-the-scenes/']) {
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor, reducedMotion: 'reduce' });
      await context.route('**/*', (request) => new URL(request.request().url()).origin === new URL(baseURL).origin ? request.continue() : request.abort());
      const page = await context.newPage();
      const images = new Map();
      const fonts = new Set();
      const pending = [];
      page.on('response', (response) => {
        if (response.request().resourceType() === 'image') pending.push(response.body().then((body) => images.set(response.url(), body.length)).catch(() => {}));
        if (response.request().resourceType() === 'font') fonts.add(response.url());
      });
      await page.goto(`${baseURL}${route}`);
      const trigger = page.locator('[data-lightbox-id]').first();
      await trigger.scrollIntoViewIfNeeded();
      await page.locator('[data-lightbox-id] img').first().evaluate((img) => img.decode());
      const firstImage = await page.locator('[data-lightbox-id] img').first().evaluate((img) => ({
        slotWidth: img.getBoundingClientRect().width,
        candidateWidth: Number(img.srcset.split(',').map((candidate) => candidate.trim().split(/\s+/)).find(([url]) => new URL(url, location.href).href === img.currentSrc)?.[1]?.replace('w', '')),
      }));
      for (let y = 0; y < await page.evaluate(() => document.documentElement.scrollHeight); y += 600) {
        await page.evaluate((scrollY) => scrollTo(0, scrollY), y);
        await page.waitForTimeout(35);
      }
      await page.waitForLoadState('networkidle');
      await Promise.all(pending);
      results.push({ route, width, height, deviceScaleFactor, ...firstImage, imageRequests: images.size, imageBytes: [...images.values()].reduce((a, b) => a + b, 0), fontRequests: fonts.size });
      await context.close();
    }
  }
} finally { await browser.close(); }
writeFileSync(output, `${JSON.stringify(results, null, 2)}\n`);
console.log(`Recorded ${results.length} gallery scenarios.`);
