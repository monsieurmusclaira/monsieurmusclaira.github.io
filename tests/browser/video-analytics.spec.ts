import { test, expect, navigate } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

for (const [slug, name, provider] of [
  ['burn', 'Burn — Trailer', 'YouTube'],
  ['bieke-depoorter-chance-encounters', 'Bieke Depoorter: Chance Encounters — Trailer', 'Vimeo'],
] as const) {
  test(`${provider} loads only on keyboard activation and retains its fallback`, async ({ page, context }) => {
    const remoteRequests: string[] = [];
    context.on('request', (request) => { if (/youtube|vimeo|google-analytics|googletagmanager/.test(new URL(request.url()).hostname)) remoteRequests.push(request.url()); });
    await page.route(/https:\/\/(www.youtube-nocookie.com|player.vimeo.com)\//, (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><title>Mock player</title><main><h1>Mock player</h1></main></html>' }));
    await page.goto(`/projects/${slug}/`);
    const play = page.getByRole('button', { name: `Play ${name} on ${provider}`, exact: true });
    await play.scrollIntoViewIfNeeded();
    await expect(page.locator('[data-video-player] iframe')).toHaveCount(0);
    expect(remoteRequests).toEqual([]);
    await play.focus();
    await page.keyboard.press('Enter');
    const iframe = page.locator('[data-video-player] iframe');
    await expect(iframe).toHaveAttribute('title', name);
    await expect(iframe).toHaveAttribute('src', /autoplay=1/);
    await expect(iframe).toBeFocused();
    await expect(page.getByRole('link', { name: new RegExp(`Watch trailer on ${provider}`) })).toBeVisible();
    expect(remoteRequests).toHaveLength(1);
    const results = await new AxeBuilder({ page }).include('[data-video-player]').analyze();
    expect(results.violations).toEqual([]);
  });
}

test('blocked players retain direct watch links for both providers', async ({ page }) => {
  for (const slug of ['burn', 'bieke-depoorter-chance-encounters']) {
    const failures: string[] = [];
    const failed = (request: import('@playwright/test').Request) => {
      if (/youtube-nocookie|player.vimeo/.test(request.url())) failures.push(request.url());
    };
    page.on('requestfailed', failed);
    await page.goto(`/projects/${slug}/`);
    await page.locator('[data-video-play]').click();
    await expect.poll(() => failures.length).toBeGreaterThan(0);
    await expect(page.getByRole('link', { name: /Watch trailer on/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Watch trailer on/ })).toHaveAttribute('href', /https:\/\/(www.youtube.com\/watch|vimeo.com\/)/);
    page.off('requestfailed', failed);
  }
});

test('no JavaScript still provides working provider watch links', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  await context.route('**/*', (route) => new URL(route.request().url()).origin === new URL(baseURL!).origin ? route.continue() : route.abort());
  const page = await context.newPage();
  for (const slug of ['burn', 'les-homards-immortels']) {
    await page.goto(`${baseURL}/projects/${slug}/`);
    await expect(page.locator('[data-video-play]')).toBeHidden();
    await expect(page.locator('[data-video-player] iframe')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Watch (trailer|teaser) on/ })).toHaveAttribute('href', /https:\/\/(www.youtube.com\/watch|vimeo.com\/)/);
  }
  await context.close();
});

test('local production previews make no analytics calls even with a saved opt-in', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('portfolio-analytics-choice-v1', 'accepted'));
  const calls: string[] = [];
  page.on('request', (request) => { if (/google-analytics|googletagmanager/.test(request.url())) calls.push(request.url()); });
  await page.goto('/');
  await navigate(page, () => page.locator('#selected-work a').first().click());
  await expect(page.locator('#portfolio-ga4')).toHaveCount(0);
  await expect(page.locator('#analytics-consent')).toBeHidden();
  expect(calls).toEqual([]);
});

// Proxy the canonical hostname to the local build and mock Google's script.
// This exercises production consent behavior without sending any real telemetry.
async function productionHost(page: import('@playwright/test').Page, baseURL: string) {
  await page.route('https://victormaes.com/**', async (route) => {
    const request = new URL(route.request().url());
    const response = await route.fetch({ url: `${baseURL}${request.pathname}${request.search}`, headers: { ...route.request().headers(), host: new URL(baseURL).host } });
    await route.fulfill({ response });
  });
  await page.route('https://www.googletagmanager.com/**', (route) => route.fulfill({ contentType: 'text/javascript', body: 'window.__mockGaLoaded = true;' }));
}
async function pageViews(page: import('@playwright/test').Page) {
  return page.evaluate(() => (window as any).dataLayer?.filter((args: any) => args[0] === 'event' && args[1] === 'page_view').map((args: any) => args[2].page_location) ?? []);
}

test('consent gates GA4 and route changes count once across back and forward', async ({ page, baseURL }) => {
  await productionHost(page, baseURL!);
  let tagRequests = 0;
  page.on('request', (request) => { if (request.url().startsWith('https://www.googletagmanager.com/')) tagRequests++; });
  await page.goto('https://victormaes.com/');
  await expect(page.getByRole('heading', { name: 'Optional analytics' })).toBeVisible();
  expect(tagRequests).toBe(0);
  await page.getByRole('button', { name: 'Allow analytics', exact: true }).click();
  await expect.poll(() => pageViews(page)).toEqual(['https://victormaes.com/']);
  await expect(page.locator('#portfolio-ga4')).toHaveCount(1);
  await page.evaluate(() => document.dispatchEvent(new Event('astro:page-load')));
  expect(await pageViews(page)).toHaveLength(1);
  await navigate(page, () => page.locator('#selected-work a').first().click());
  const project = page.url().split('#')[0];
  await navigate(page, () => page.locator('.navbar-center a').click());
  await navigate(page, () => page.locator('footer a[href="/about/"]').click());
  await expect.poll(() => pageViews(page)).toEqual(['https://victormaes.com/', project, 'https://victormaes.com/', 'https://victormaes.com/about/']);
  // Contact and modal fragments must not introduce an additional page view.
  await page.evaluate(() => { history.pushState({}, '', '#contact'); document.dispatchEvent(new Event('astro:page-load')); });
  expect(await pageViews(page)).toHaveLength(4);
  await page.goBack();
  await expect(page).toHaveURL('https://victormaes.com/about/');
  expect(await pageViews(page)).toHaveLength(4);
  await navigate(page, () => page.goBack());
  await navigate(page, () => page.goForward());
  await expect.poll(() => pageViews(page)).toEqual(['https://victormaes.com/', project, 'https://victormaes.com/', 'https://victormaes.com/about/', 'https://victormaes.com/', 'https://victormaes.com/about/']);
  expect(tagRequests).toBe(1);
  const config = await page.evaluate(() => Array.from((window as any).dataLayer.find((args: any) => args[0] === 'config')));
  expect(config[2]).toMatchObject({ send_page_view: false });
});

test('decline persists, can be changed, and withdrawal stops further page events', async ({ page, baseURL }) => {
  await productionHost(page, baseURL!);
  await page.goto('https://victormaes.com/about/');
  await page.getByRole('button', { name: 'No thanks', exact: true }).click();
  await page.reload();
  await expect(page.locator('#analytics-consent')).toBeHidden();
  await expect(page.locator('#portfolio-ga4')).toHaveCount(0);
  const settings = page.getByRole('button', { name: 'Analytics settings', exact: true });
  await settings.click();
  await expect(page.locator('#analytics-consent')).toBeFocused();
  const axe = await new AxeBuilder({ page }).include('#analytics-consent').analyze();
  expect(axe.violations).toEqual([]);
  await page.getByRole('button', { name: 'Allow analytics', exact: true }).click();
  await expect(settings).toBeFocused();
  await expect.poll(() => pageViews(page)).toEqual(['https://victormaes.com/about/']);
  await page.evaluate(() => { document.cookie = '_ga=example; path=/'; document.cookie = '_ga_TEST=example; path=/'; });
  await settings.click();
  await page.getByRole('button', { name: 'No thanks', exact: true }).click();
  expect(await page.evaluate(() => (window as any)['ga-disable-G-1P80SYF663'])).toBe(true);
  expect(await page.evaluate(() => document.cookie)).not.toContain('_ga');
  await navigate(page, () => page.locator('.navbar-center a').click());
  expect(await pageViews(page)).toEqual([]);
  await page.getByRole('button', { name: 'Analytics settings', exact: true }).click();
  await page.getByRole('button', { name: 'Allow analytics', exact: true }).click();
  await expect.poll(() => pageViews(page)).toEqual(['https://victormaes.com/']);
  await expect(page.locator('#portfolio-ga4')).toHaveCount(1);
});

test('key pages stay usable at 200% zoom-equivalent size', async ({ page }) => {
  // A 1280px desktop at 200% browser zoom exposes a 640px CSS layout viewport.
  await page.setViewportSize({ width: 640, height: 360 });
  for (const route of ['/', '/projects/burn/', '/about/', '/behind-the-scenes/']) {
    await page.goto(route);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.locator('footer a[href="/about/"]').scrollIntoViewIfNeeded();
    await expect(page.locator('footer a[href="/about/"]')).toBeVisible();
  }
});
