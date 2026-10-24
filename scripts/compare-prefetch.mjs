import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const output = process.argv[2];
if (!output) throw new Error('Provide an output JSON path.');
const origin = 'http://127.0.0.1:4323';
const browser = await chromium.launch();
const results = [];
try {
  for (const policy of ['current', 'project-opt-in']) {
    for (const saveData of [false, true]) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
      await context.addInitScript((save) => {
        if (save) Object.defineProperty(navigator, 'connection', { value: { saveData: true, effectiveType: '2g' }, configurable: true });
      }, saveData);
      await context.route('**/*', async (route) => {
        if (new URL(route.request().url()).origin !== origin) return route.abort();
        if (policy === 'project-opt-in' && !/\.[a-z0-9]+$/i.test(new URL(route.request().url()).pathname)) {
          const response = await route.fetch();
          if ((response.headers()['content-type'] ?? '').includes('text/html')) {
            const body = (await response.text()).replace(/<a\b([^>]+)>/g, (tag, attrs) => attrs.includes('data-astro-prefetch') ? tag : `<a${attrs} data-astro-prefetch="${/href="\/projects\//.test(attrs) ? 'hover' : 'false'}">`);
            return route.fulfill({ response, body });
          }
          return route.fulfill({ response });
        }
        return route.continue();
      });
      const page = await context.newPage();
      const requests = [];
      page.on('request', (request) => {
        if (request.resourceType() !== 'document' && new URL(request.url()).pathname.endsWith('/')) requests.push(new URL(request.url()).pathname);
      });
      await page.goto(origin);
      await page.waitForTimeout(300);
      const idleRequests = [...requests];
      await page.locator('#desktop-links a[href="/about/"]').hover();
      await page.waitForTimeout(250);
      const navHoverRequests = requests.slice(idleRequests.length);
      const before = requests.length;
      await page.locator('.featured-film').first().hover();
      await page.waitForTimeout(250);
      const cardHoverRequests = requests.slice(before);
      const prefetchHints = await page.locator('link[rel="prefetch"]').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
      results.push({ policy, saveData, idleRequests, navHoverRequests, cardHoverRequests, prefetchHints });
      await context.close();
    }
  }
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  await context.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.goto(`${origin}/projects/burn/`);
  const fetchedMedia = [];
  page.on('request', (request) => { if (['fetch', 'other'].includes(request.resourceType()) && /\.(webp|avif|jpe?g|png)/.test(request.url())) fetchedMedia.push(request.url()); });
  const trigger = page.locator('a[data-lightbox-id]').first();
  const optOut = await trigger.getAttribute('data-astro-prefetch');
  await trigger.hover();
  await page.waitForTimeout(300);
  results.push({ gallery: { optOut, fetchedMedia } });
  await context.close();
} finally { await browser.close(); }
writeFileSync(output, `${JSON.stringify(results, null, 2)}\n`);
console.log(results);
