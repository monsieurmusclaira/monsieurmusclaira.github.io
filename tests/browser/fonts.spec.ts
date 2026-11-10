import { test, expect, navigate, primaryFamily } from './fixtures';

test("the hero title's font file is preloaded", async ({ page }) => {
  for (const path of ['/', '/about/', '/projects/burn/', '/behind-the-scenes/']) {
    const requests = new Set<string>();
    const collect = (request: import('@playwright/test').Request) => { if (request.resourceType() === 'font') requests.add(request.url()); };
    page.on('request', collect);
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const heading = await page.locator('h1').evaluate((el) => {
      const style = getComputedStyle(el);
      return { family: style.fontFamily, weight: style.fontWeight, style: style.fontStyle };
    });
    expect(heading.weight, path).toBe(path === '/' ? '400' : '600');
    const loaded = await page.evaluate(({ family, weight, style }) => [...document.fonts].filter((face) => face.family.replaceAll('"', '') === family.replaceAll('"', '') && face.weight === weight && face.style === style && face.status === 'loaded').length, { ...heading, family: primaryFamily(heading.family) });
    expect(loaded, path).toBeGreaterThanOrEqual(1);
    const preloads = await page.locator('link[rel="preload"][as="font"]').evaluateAll((links) => links.map((link) => (link as HTMLLinkElement).href));
    expect(preloads, path).toHaveLength(2);
    expect(preloads.every((url) => requests.has(url)), path).toBe(true);
    page.off('request', collect);
  }
});

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
      serif: (await document.fonts.load(`600 16px ${serif}`, sample)).length,
    };
  }, { sans: primaryFamily(families.sans), serif: primaryFamily(families.serif) });
  expect(loaded.sans).toBeGreaterThan(0);
  expect(loaded.serif).toBeGreaterThan(0);
  await navigate(page, () => page.getByRole('link', { name: 'Burn', exact: true }).click());
  await page.evaluate(() => document.fonts.ready);
  expect(fonts.length).toBeGreaterThan(0);
  expect(fonts.every((url) => new URL(url).origin === new URL(page.url()).origin)).toBe(true);
  expect(new Set(fonts).size).toBe(fonts.length);
});
