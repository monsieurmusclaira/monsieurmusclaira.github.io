import AxeBuilder from '@axe-core/playwright';
import { test, expect, navigate } from './fixtures';

for (const path of ['/projects/burn/', '/behind-the-scenes/']) {
  test(`one lazy dialog with sequence, captions and keyboard controls on ${path}`, async ({ page }) => {
    await page.goto('/');
    if (path === '/behind-the-scenes/') {
      if (page.viewportSize()!.width < 1024) {
        await page.locator('#menu-toggle').click();
        await navigate(page, () => page.locator('#mobile-menu a[href="/behind-the-scenes/"]').click());
      } else await navigate(page, () => page.locator('#desktop-links a[href="/behind-the-scenes/"]').click());
    } else await navigate(page, () => page.locator('a[href="/projects/burn/"]').first().click());
    await expect(page.locator('dialog.lightbox')).toHaveCount(1);
    const triggers = page.locator('a[data-lightbox-id]');
    const count = await triggers.count();
    const ids = await triggers.evaluateAll((elements) => elements.map((el) => el.id));
    expect(new Set(ids).size).toBe(count);
    await expect(page.locator('[data-gallery-image]')).not.toHaveAttribute('src');
    const first = triggers.first();
    const full = await first.getAttribute('href');
    const requested: string[] = [];
    page.on('request', (request) => requested.push(new URL(request.url()).pathname));
    await first.scrollIntoViewIfNeeded();
    expect(requested).not.toContain(full);
    await first.focus();
    await page.keyboard.press('Space');
    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-gallery-image]')).toHaveAttribute('src', new URL(full!, page.url()).href);
    await expect.poll(() => requested.includes(full!)).toBe(true);
    await expect(dialog.locator('[data-gallery-position]')).toHaveText(`1 of ${count}`);
    await page.keyboard.press('ArrowRight');
    await expect(dialog.locator('[data-gallery-position]')).toHaveText(`2 of ${count}`);
    await expect(dialog.locator('[data-gallery-image]')).toHaveAttribute('alt', (await triggers.nth(1).getAttribute('data-lightbox-alt'))!);
    await dialog.getByRole('button', { name: 'Previous image' }).click();
    await page.keyboard.press('ArrowLeft');
    await expect(dialog.locator('[data-gallery-position]')).toHaveText(`${count} of ${count}`);
    await dialog.getByRole('button', { name: 'Next image' }).click();
    await expect(dialog.locator('[data-gallery-position]')).toHaveText(`1 of ${count}`);
    const scan = await new AxeBuilder({ page }).include('#gallery-lightbox').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(scan.violations).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(first).toBeFocused();
    await expect(page.locator('[data-gallery-image]')).not.toHaveAttribute('src');
    const captioned = page.locator('a[data-lightbox-caption]').first();
    if (await captioned.count()) {
      await captioned.click();
      await expect(page.locator('[data-gallery-caption]')).toHaveText((await captioned.getAttribute('data-lightbox-caption'))!);
      await page.keyboard.press('Escape');
      await expect(captioned).toBeFocused();
    }
    await first.click();
    await navigate(page, () => page.goBack());
    await expect(page.locator('dialog[open]')).toHaveCount(0);
  });
}

for (const deviceScaleFactor of [1, 2]) {
  test(`grid image chooses a matching candidate at DPR ${deviceScaleFactor}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor, reducedMotion: 'reduce' });
    await context.route('**/*', (route) => new URL(route.request().url()).origin === new URL(baseURL!).origin ? route.continue() : route.abort());
    const page = await context.newPage();
    try {
      await page.goto(`${baseURL}/projects/bieke-depoorter-chance-encounters/`);
      const image = page.locator('[data-gallery-layout="grid"] img').first();
      await image.scrollIntoViewIfNeeded();
      // Lazy-image selection begins asynchronously in Firefox and WebKit.
      // Wait for a completed request before reading the selected candidate.
      await expect.poll(() => image.evaluate((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0)).toBe(true);
      const selected = await image.evaluate((el) => {
        const img = el as HTMLImageElement;
        return { slot: img.getBoundingClientRect().width, candidate: Number(img.srcset.split(',').map((value) => value.trim().split(/\s+/)).find(([url]) => new URL(url, location.href).href === img.currentSrc)?.[1]?.replace('w', '')) };
      });
      expect(selected.slot).toBeCloseTo(554, 0);
      expect(selected.candidate).toBe(deviceScaleFactor === 1 ? 576 : 1152);
    } finally { await context.close(); }
  });
}

test('full-size photo links work without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce' });
  await context.route('**/*', (route) => new URL(route.request().url()).origin === new URL(baseURL!).origin ? route.continue() : route.abort());
  const page = await context.newPage();
  try {
    await page.goto(`${baseURL}/projects/burn/`);
    const link = page.locator('a[data-lightbox-id]').first();
    const full = new URL((await link.getAttribute('href'))!, page.url()).href;
    const [response] = await Promise.all([
      page.waitForResponse((response) => response.url() === full),
      link.click(),
    ]);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/^image\//);
    await expect(page).toHaveURL(full);
  } finally { await context.close(); }
});

test('gallery captions render markup as plain text', async ({ page }) => {
  await page.goto('/projects/burn/');
  const link = page.locator('a[data-lightbox-id]').first();
  const caption = '<strong>A caption & more</strong>';
  await link.evaluate((element, value) => element.setAttribute('data-lightbox-caption', value), caption);
  await link.click();
  const output = page.locator('[data-gallery-caption]');
  await expect(output).toHaveText(caption);
  await expect(output.locator('strong')).toHaveCount(0);
});
