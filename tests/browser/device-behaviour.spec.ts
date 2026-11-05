import { test, expect } from './fixtures';

// Behaviour that synthetic events cannot prove: real media decoding and real touch input.

test('the hero falls back to the HEVC MP4 and plays it when WebM is unavailable', async ({ browser, browserName, baseURL }) => {
  test.skip(browserName !== 'webkit', 'Safari is the engine that needs the MP4 fallback.');
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'no-preference' });
  const origin = new URL(baseURL!).origin;
  const requested: string[] = [];
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname.endsWith('.webm')) return route.abort();
    if (url.pathname.endsWith('.mp4')) requested.push(url.pathname);
    return route.continue();
  });
  const page = await context.newPage();
  await page.goto('/');
  const state = await page.waitForFunction(() => {
    const video = document.querySelector<HTMLVideoElement>('#hero-video')!;
    return video.readyState >= 2 && video.videoWidth > 0 && video.currentSrc.endsWith('.mp4') ? { src: video.currentSrc, width: video.videoWidth, time: video.currentTime } : false;
  }, null, { timeout: 15_000 });
  const first = await state.jsonValue() as { src: string; width: number };
  expect(first.src).toMatch(/seethrough-loop\.mp4$/);
  expect(first.width).toBe(1000);
  expect(requested.length).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => document.querySelector<HTMLVideoElement>('#hero-video')!.currentTime), { timeout: 10_000 }).toBeGreaterThan(0.2);
  expect(await page.evaluate(() => document.querySelector<HTMLVideoElement>('#hero-video')!.paused)).toBe(false);
  await context.close();
});

test('the lightbox moves between images with a real touch swipe', async ({ browser, browserName, baseURL }) => {
  test.skip(browserName !== 'chromium', 'Playwright only exposes raw touch dispatch (CDP) in Chromium.');
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, baseURL });
  const origin = new URL(baseURL!).origin;
  await context.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.goto('/projects/burn/');
  const count = await page.locator('a[data-lightbox-id]').count();
  const first = page.locator('a[data-lightbox-id]').first();
  await first.scrollIntoViewIfNeeded();
  await first.tap();
  const dialog = page.locator('dialog[open]');
  const position = dialog.locator('[data-gallery-position]');
  await expect(position).toHaveText(`1 of ${count}`);
  const box = (await dialog.locator('[data-gallery-image]').boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const cdp = await context.newCDPSession(page);
  const swipe = async (dx: number, dy = 0) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 8; step++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (dx * step) / 8, y: y + (dy * step) / 8 }] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  await swipe(-140);
  await expect(position).toHaveText(`2 of ${count}`);
  await swipe(140);
  await expect(position).toHaveText(`1 of ${count}`);
  await context.close();
});
