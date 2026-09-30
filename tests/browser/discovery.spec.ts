import AxeBuilder from '@axe-core/playwright';
import { test, expect, navigate } from './fixtures';

test('award photograph is visible without opening a toggle', async ({ page }) => {
  await page.goto('/projects/a-long-goodbye/');
  const photograph = page.locator('[data-featured-recognition] figure img');
  await expect(photograph).toBeVisible();
  await photograph.scrollIntoViewIfNeeded();
  await expect.poll(() => photograph.evaluate((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0)).toBe(true);
});

test('filmography filters combine, reset, and survive navigation', async ({ page }) => {
  await page.goto('/#all-work');
  const form = page.getByRole('form', { name: 'Filter filmography' });
  const visible = page.locator('[data-work-item]:not([hidden])');
  await expect(visible).toHaveCount(17);
  await form.getByLabel('Role', { exact: true }).selectOption('Director');
  await expect(visible).toHaveCount(1);
  await expect(visible).toContainText('A Long Goodbye');
  await form.getByLabel('Format', { exact: true }).selectOption('Fiction');
  await expect(visible).toHaveCount(0);
  await expect(page.locator('[data-work-count]')).toHaveText('0 of 17 projects');
  await expect(page.locator('[data-work-empty]')).toBeVisible();
  const scan = await new AxeBuilder({ page }).include('#all-work').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);
  const reset = form.getByRole('button', { name: 'Clear filters' });
  await reset.focus();
  await page.keyboard.press('Enter');
  await expect(visible).toHaveCount(17);
  await expect(reset).toBeFocused();
  await expect(form.getByLabel('Format', { exact: true })).toHaveValue('');
  await expect(form.getByLabel('Role', { exact: true })).toHaveValue('');
  await expect(page.locator('[data-work-empty]')).toBeHidden();
  await form.getByLabel('Format', { exact: true }).selectOption('Documentary');
  await expect(visible).toHaveCount(2);
  await navigate(page, () => visible.first().getByRole('link').click());
  await navigate(page, () => page.getByRole('link', { name: 'Back to all work' }).click());
  await expect(form).toBeVisible();
  await form.getByLabel('Role', { exact: true }).selectOption('Director');
  await expect(visible).toHaveCount(1);
  await expect(page.locator('[data-work-count]')).toHaveText('1 of 17 projects');
});

test('projects retain recognition and gallery navigation with one closing contact action', async ({ page }) => {
  await page.goto('/projects/ever-since-i-have-been-flying/');
  expect(await page.locator('[data-featured-recognition]').evaluate((el) => Boolean(el.compareDocumentPosition(document.querySelector('[data-youtube-frame]')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  await expect(page.getByRole('heading', { name: 'Synopsis', exact: true })).toBeVisible();
  await expect(page.locator('#project-intro a')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Email me', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Discuss a project' })).toHaveCount(1);
  await expect(page.locator('[data-gallery-opening] [data-lightbox-id]')).toHaveCount(6);
  const remaining = page.locator('[data-gallery-remaining]');
  await expect(remaining).toBeHidden();
  await expect(remaining.locator('[data-lightbox-id]')).toHaveCount(33);
  const summary = page.locator('[data-gallery-expansion] summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(remaining).toBeVisible();
  const last = remaining.locator('[data-lightbox-id]').last();
  await last.click();
  await expect(page.locator('[data-gallery-position]')).toHaveText('39 of 39');
  await page.keyboard.press('Escape');
  await expect(last).toBeFocused();
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(remaining).toBeHidden();
  await expect(summary).toBeFocused();
});

test('no JavaScript preserves the entire filmography and expandable photos', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce' });
  await context.route('**/*', (route) => new URL(route.request().url()).origin === new URL(baseURL!).origin ? route.continue() : route.abort());
  const page = await context.newPage();
  try {
    await page.goto(`${baseURL}/#all-work`);
    await expect(page.locator('[data-work-filters]')).toBeHidden();
    await expect(page.locator('[data-work-item]')).toHaveCount(17);
    expect(await page.locator('[data-work-item]').evaluateAll((items) => items.every((item) => item.getClientRects().length > 0))).toBe(true);
    await page.goto(`${baseURL}/projects/ever-since-i-have-been-flying/`);
    await page.locator('[data-gallery-expansion] summary').click();
    const last = page.locator('[data-gallery-remaining] [data-lightbox-id]').last();
    await expect(last).toBeVisible();
    const href = new URL((await last.getAttribute('href'))!, page.url()).href;
    await last.click();
    await expect(page).toHaveURL(href);
  } finally { await context.close(); }
});

test('compact phone cards and biography links preserve project access', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('.featured-film').first();
  const height = await card.evaluate((el) => el.getBoundingClientRect().height);
  if (page.viewportSize()!.width < 640) expect(height).toBeLessThan(page.viewportSize()!.height);
  else expect(height).toBeCloseTo(page.viewportSize()!.height, 0);
  await page.goto('/about/');
  for (const slug of ['ever-since-i-have-been-flying', 'burn', 'the-tears-of-things', 'a-long-goodbye']) {
    await expect(page.locator(`main a[href="/projects/${slug}/"]`)).toBeVisible();
  }
  await expect(page.locator('#contact a[href="mailto:hello@victormaes.com"]')).toBeVisible();
});
