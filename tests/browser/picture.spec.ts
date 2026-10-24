import { test, expect } from './fixtures';

for (const fallback of [false, true]) {
  test(`portrait preserves geometry with ${fallback ? 'WebP fallback' : 'AVIF selection'}`, async ({ page }) => {
    if (fallback) {
      // Emulate an unsupported source type while exercising the actual fallback.
      await page.route('**/about/', async (route) => {
        const response = await route.fetch();
        const body = (await response.text()).replace(/<source\b[^>]*type="image\/avif"[^>]*>/g, '');
        await route.fulfill({ response, body });
      });
    }
    await page.goto('/about/');
    const image = page.getByAltText('Portrait of Victor Maes, cinematographer and director based in Belgium');
    await image.scrollIntoViewIfNeeded();
    const actual = await image.evaluate(async (el: HTMLImageElement) => {
      await el.decode();
      const rect = el.getBoundingClientRect();
      return { src: el.currentSrc, ratio: rect.width / rect.height, sourceRatio: el.width / el.height, loading: el.loading };
    });
    expect(actual.src).toMatch(fallback ? /\.webp$/ : /\.avif$/);
    expect(actual.ratio).toBeCloseTo(actual.sourceRatio, 2);
    expect(actual.loading).toBe('lazy');
    if (page.viewportSize()!.width >= 768) expect(await image.evaluate((el) => el.getBoundingClientRect().width)).toBe(300);
  });
}
