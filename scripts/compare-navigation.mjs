// Compare production routing with the isolated native prototype.
import { chromium, firefox, webkit } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const output = process.argv[2];
if (!output) throw new Error('Provide an output JSON path.');
const results = [];
for (const [architecture, baseURL] of [['router', 'http://127.0.0.1:4323'], ['native', 'http://127.0.0.1:19432']]) {
  for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await type.launch();
    try {
      for (const motion of ['reduce', 'no-preference']) {
        const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: motion });
        const requests = [];
        await context.route('**/*', (route) => {
          if (new URL(route.request().url()).origin === new URL(baseURL).origin) return route.continue();
          return route.abort();
        });
        const page = await context.newPage();
        await page.addInitScript(() => { Object.defineProperty(window, 'portfolioNavigationDocument', { value: Math.random() }); });
        page.on('request', (request) => requests.push({ url: new URL(request.url()).pathname, type: request.resourceType() }));
        await page.goto(`${baseURL}/`);
        const initial = await page.evaluate(() => Reflect.get(window, 'portfolioNavigationDocument'));
        const card = page.locator('a[href="/projects/burn/"]').first();
        await card.scrollIntoViewIfNeeded();
        const scroll = await page.evaluate(() => scrollY);
        const start = Date.now();
        await card.click();
        await page.waitForURL('**/projects/burn/');
        await page.getByRole('heading', { level: 1 }).waitFor();
        await page.waitForTimeout(500);
        const navigationMilliseconds = Date.now() - start;
        const replacedDocument = initial !== await page.evaluate(() => Reflect.get(window, 'portfolioNavigationDocument'));
        const trigger = page.getByRole('button', { name: /^View full size:/ }).first();
        await trigger.click();
        if (!await page.locator('dialog[open]').isVisible()) throw new Error(`${architecture}/${engine}: lightbox failed`);
        await page.keyboard.press('Escape');
        if (!await trigger.evaluate((el) => document.activeElement === el)) throw new Error('Lightbox focus was not restored.');
        await page.goBack();
        await page.waitForURL(baseURL + '/');
        await page.waitForTimeout(500);
        const backScroll = await page.evaluate(() => scrollY);
        const heroSourcesAfterBack = await page.locator('#hero-video source[src]').count();
        await page.setViewportSize({ width: 390, height: 844 });
        await page.locator('#menu-toggle').click();
        if (await page.locator('#menu-toggle').getAttribute('aria-expanded') !== 'true') throw new Error('Menu failed after back navigation.');
        await page.keyboard.press('Escape');
        results.push({ architecture, engine, browser: browser.version(), motion, navigationMilliseconds, replacedDocument, scroll, backScroll, heroSourcesAfterBack, requests });
        writeFileSync(output, `${JSON.stringify(results, null, 2)}\n`);
        await context.close();
      }
      // Proxy the canonical host and mock analytics; no real telemetry is sent.
      const context = await browser.newContext({ reducedMotion: 'reduce' });
      const page = await context.newPage();
      await page.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (url.hostname === 'victormaes.com') {
          const response = await route.fetch({ url: `${baseURL}${url.pathname}${url.search}`, headers: { ...route.request().headers(), host: new URL(baseURL).host } });
          return route.fulfill({ response });
        }
        if (url.hostname === 'www.googletagmanager.com') return route.fulfill({ contentType: 'text/javascript', body: '' });
        return route.abort();
      });
      let analyticsLoads = 0;
      page.on('request', (request) => { if (request.url().includes('googletagmanager.com')) analyticsLoads++; });
      await page.goto('https://victormaes.com/');
      if (!await page.locator('#desktop-links').count()) throw new Error(`${architecture}/${engine}: canonical proxy failed: ${await page.content()}`);
      await page.waitForTimeout(100);
      await page.locator('#desktop-links a[href="/about/"]').click();
      await page.waitForURL('**/about/');
      await page.waitForTimeout(300);
      const viewsInCurrentDocument = await page.evaluate(() => window.dataLayer?.filter((args) => args[0] === 'event' && args[1] === 'page_view').length);
      results.push({ architecture, engine, analyticsLoadsForTwoPages: analyticsLoads, viewsInCurrentDocument });
      await context.close();
    } finally { await browser.close(); }
  }
}
writeFileSync(output, `${JSON.stringify(results, null, 2)}\n`);
console.log(results.map(({ requests, ...result }) => result));
