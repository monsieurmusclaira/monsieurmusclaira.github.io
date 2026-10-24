import { test, expect, navigate } from './fixtures';

test('local fonts load once and retain their family contracts after navigation', async ({ page }) => {
  const fonts: string[] = [];
  page.on('request', (request) => { if (request.resourceType() === 'font') fonts.push(request.url()); });
  await page.goto('/about/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('link[rel="preload"][as="font"]')).toHaveCount(2);
  const loaded = await page.evaluate(async () => {
    const sans = getComputedStyle(document.documentElement).getPropertyValue('--font-montserrat').trim();
    const serif = getComputedStyle(document.documentElement).getPropertyValue('--font-eb-garamond').trim();
    const sample = 'Été, cinéma, François, België, Maës';
    return {
      sans: (await document.fonts.load(`400 16px ${sans}`, sample)).length,
      serif: (await document.fonts.load(`italic 400 16px ${serif}`, sample)).length,
    };
  });
  expect(loaded.sans).toBeGreaterThan(0);
  expect(loaded.serif).toBeGreaterThan(0);
  await navigate(page, () => page.locator('header .navbar-center a').click());
  await page.evaluate(() => document.fonts.ready);
  expect(fonts.length).toBeGreaterThan(0);
  expect(fonts.every((url) => new URL(url).origin === new URL(page.url()).origin)).toBe(true);
  expect(new Set(fonts).size).toBe(fonts.length);
});
