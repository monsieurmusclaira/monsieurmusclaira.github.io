import { test, expect, navigate, primaryFamily } from './fixtures';

test('font checks do not depend on locally installed fallback fonts', async ({ page }) => {
  await page.goto('/about/');
  const value = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--font-montserrat').trim());
  expect(value).toContain('fallback:');
  const family = primaryFamily(value);
  expect(family).not.toContain('fallback');
  expect(await page.evaluate(async (family) => (await document.fonts.load(`400 16px ${family}`)).length, family)).toBeGreaterThan(0);
});

test('local fonts load once and retain their family contracts after navigation', async ({ page }) => {
  const fonts: string[] = [];
  page.on('request', (request) => { if (request.resourceType() === 'font') fonts.push(request.url()); });
  await page.goto('/about/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('link[rel="preload"][as="font"]')).toHaveCount(2);
  const families = await page.evaluate(() => {
    const sans = getComputedStyle(document.documentElement).getPropertyValue('--font-montserrat').trim();
    const serif = getComputedStyle(document.documentElement).getPropertyValue('--font-eb-garamond').trim();
    return { sans, serif };
  });
  const loaded = await page.evaluate(async ({ sans, serif }) => {
    const sample = 'Été, cinéma, François, België, Maës';
    return {
      sans: (await document.fonts.load(`400 16px ${sans}`, sample)).length,
      serif: (await document.fonts.load(`italic 400 16px ${serif}`, sample)).length,
    };
  }, { sans: primaryFamily(families.sans), serif: primaryFamily(families.serif) });
  expect(loaded.sans).toBeGreaterThan(0);
  expect(loaded.serif).toBeGreaterThan(0);
  await navigate(page, () => page.locator('header .navbar-center a').click());
  await page.evaluate(() => document.fonts.ready);
  expect(fonts.length).toBeGreaterThan(0);
  expect(fonts.every((url) => new URL(url).origin === new URL(page.url()).origin)).toBe(true);
  expect(new Set(fonts).size).toBe(fonts.length);
});
