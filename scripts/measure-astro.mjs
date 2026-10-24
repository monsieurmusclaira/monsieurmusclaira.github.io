// Reproducible local lab comparison (not field metrics).
// node scripts/measure-astro.mjs <output-directory> [local-preview-url]
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { join } from 'node:path';

const output = process.argv[2];
const baseURL = process.argv[3] ?? 'http://127.0.0.1:4323';
if (!output || !['127.0.0.1', 'localhost'].includes(new URL(baseURL).hostname)) {
  throw new Error('Provide an output directory and a local production preview URL.');
}
mkdirSync(output, { recursive: true });
// Keep the same browser executable across dependency comparisons when possible.
const browser = await chromium.launch({ executablePath: process.env.PORTFOLIO_CHROMIUM_PATH });
const results = { node: process.version, browser: browser.version(), playwright: JSON.parse(readFileSync('node_modules/@playwright/test/package.json')).version, astro: JSON.parse(readFileSync('node_modules/astro/package.json')).version, conditions: 'DPR 2; reduced motion; no CPU/network throttling; third parties blocked; fresh context each run; compression calculated from response bodies because preview serves uncompressed files', runs: [], medians: [] };
try {
  for (const width of [1280, 390]) {
    for (const route of ['/', '/about/', '/projects/ever-since-i-have-been-flying/', '/behind-the-scenes/']) {
      for (let run = 1; run <= 3; run++) {
        const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 720 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
        const blocked = [];
        await context.route('**/*', (request) => {
          if (new URL(request.request().url()).origin === new URL(baseURL).origin) return request.continue();
          blocked.push(request.request().url());
          return request.abort();
        });
        const page = await context.newPage();
        await page.addInitScript(() => {
          window.__lab = { lcp: 0, cls: 0, longTasks: 0 };
          new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__lab.lcp = entry.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
          new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__lab.cls += entry.value; }).observe({ type: 'layout-shift', buffered: true });
          new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__lab.longTasks += Math.max(0, entry.duration - 50); }).observe({ type: 'longtask', buffered: true });
        });
        const resources = [];
        const pending = [];
        page.on('response', (response) => {
          const type = response.request().resourceType();
          if (!['stylesheet', 'font', 'image', 'script', 'document'].includes(type)) return;
          pending.push((async () => {
            try {
              const body = await response.body();
              resources.push({ url: new URL(response.url()).pathname, type, bytes: body.length, gzipBytes: gzipSync(body).length, brotliBytes: brotliCompressSync(body).length });
            } catch { /* A navigation can cancel speculative responses. */ }
          })());
        });
        await page.goto(`${baseURL}${route}`);
        await page.waitForTimeout(1500);
        await page.evaluate(() => document.fonts.ready);
        const metrics = await page.evaluate(() => ({ ...window.__lab, images: [...document.images].filter((img) => img.getBoundingClientRect().top < innerHeight).map((img) => ({ src: new URL(img.currentSrc || img.src, location.href).pathname, width: img.getBoundingClientRect().width, naturalWidth: img.naturalWidth, sizes: img.sizes })), fonts: [...document.fonts].filter((font) => font.status === 'loaded').map((font) => ({ family: font.family, weight: font.weight, style: font.style })) }));
        if (run === 1) await page.screenshot({ path: join(output, `${route.replaceAll('/', '_') || 'home'}-${width}.png`) });
        await Promise.all(pending);
        const coldResources = [...resources];
        const link = page.locator(route === '/' ? '#desktop-links a[href="/about/"]' : 'header .navbar-center a');
        if (width === 1280) await link.hover();
        await page.waitForTimeout(300);
        const beforeNavigation = resources.length;
        await link.evaluate((el) => { if (el instanceof HTMLElement) el.click(); });
        await page.waitForTimeout(700);
        await Promise.all(pending);
        results.runs.push({ route, width, run, ...metrics, resources: coldResources, hoverRequests: resources.slice(coldResources.length, beforeNavigation), warmNavigationRequests: resources.slice(beforeNavigation), blocked });
        writeFileSync(join(output, 'measurements.json'), `${JSON.stringify(results, null, 2)}\n`);
        await context.close();
      }
      const runs = results.runs.filter((r) => r.route === route && r.width === width);
      const median = (key) => runs.map((r) => r[key]).sort((a, b) => a - b)[1];
      results.medians.push({ route, width, lcpMilliseconds: median('lcp'), cls: median('cls'), longTaskBlockingMilliseconds: median('longTasks') });
      console.log(`${width} ${route}: LCP ${median('lcp').toFixed(0)}ms; CLS ${median('cls').toFixed(4)}`);
    }
  }
} finally {
  await browser.close();
  writeFileSync(join(output, 'measurements.json'), `${JSON.stringify(results, null, 2)}\n`);
}
