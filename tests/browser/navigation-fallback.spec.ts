import { test, expect, navigate } from './fixtures';

test('router fallback keeps navigation and galleries usable without the transition API', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    Object.defineProperty(document, 'startViewTransition', { value: undefined, configurable: true });
  });
  await page.goto('/');
  await navigate(page, () => page.locator('a[href="/projects/burn/"]').first().click());
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Burn');
  const trigger = page.getByRole('button', { name: /^View full size:/ }).first();
  await trigger.click();
  await expect(page.locator('dialog[open]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await navigate(page, () => page.goBack());
  await expect(page.locator('[data-work-filters]')).toBeVisible();
});
