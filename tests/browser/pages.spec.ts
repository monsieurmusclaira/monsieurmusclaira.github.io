import { readdirSync, readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";

test('controls meet the 44px minimum on phones', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/', '/about/', '/behind-the-scenes/', '/projects/burn/', '/missing/']) {
    await page.goto(path);
    await page.locator('#menu-toggle').click();
    const offenders = await page.locator('a, button, select, summary').evaluateAll((controls) => controls.flatMap((control) => {
      const bounds = control.getBoundingClientRect();
      const paragraph = control.closest('p');
      const inline = control.tagName === 'A' && paragraph && paragraph.textContent?.replace(control.textContent ?? '', '').trim();
      if (!bounds.width || !bounds.height || getComputedStyle(control).visibility === 'hidden' || control.closest('.sr-only') || control.getAttribute('href') === '#main' || inline) return [];
      return bounds.height < 44 ? [{ text: control.textContent?.trim() || control.getAttribute('aria-label'), height: bounds.height }] : [];
    }));
    expect(offenders, path).toEqual([]);
  }
});

test('project pages mark Work as the current section', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/projects/burn/');
  await expect(page.locator('#desktop-links a[href="/"]')).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('#mobile-menu a[href="/"]')).toHaveAttribute('aria-current', 'true');
});

test('about page labels its facts and describes each image once', async ({ page }) => {
  await page.goto('/about/');
  await expect(page.getByRole('heading', { level: 2, name: 'At a glance', exact: true })).toBeVisible();
  await expect(page.getByText('Project details', { exact: true })).toHaveCount(0);
  const descriptions = await page.locator('main img[alt]:not([alt=""])').evaluateAll((images) => images.map((image) => image.getAttribute('alt')));
  expect(new Set(descriptions).size).toBe(descriptions.length);
});
import { test, expect } from "./fixtures";

const projects = readdirSync("src/content/projects").filter((file) => file.endsWith(".mdx")).map((file) => `/projects/${file.replace(/\.mdx$/, "")}/`);
const routes = ["/", "/about/", "/behind-the-scenes/", "/404.html", ...projects];

test("every route has one meaningful H1 and local links and assets resolve", async ({ page, request, baseURL }) => {
  test.setTimeout(90_000);
  const links = new Set<string>();
  const assets = new Set<string>();
  for (const path of routes) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(page.viewportSize()!.width);
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading, path).toHaveCount(1);
    expect((await heading.innerText()).trim(), path).not.toBe("");
    const references = await page.evaluate(() => ({
      links: [...document.querySelectorAll<HTMLAnchorElement>("a[href]")].map((a) => a.href),
      assets: [...document.querySelectorAll("[src], [srcset], [poster], [data-src], link[rel='icon'], link[rel='apple-touch-icon'], link[rel='stylesheet'], link[rel='preload']")].flatMap((el) => [
        el.getAttribute("src"), el.getAttribute("poster"), el.getAttribute("data-src"), el.tagName === "LINK" ? el.getAttribute("href") : null,
        ...(el.getAttribute("srcset")?.split(",").map((candidate) => candidate.trim().split(/\s+/)[0]) ?? []),
      ]).filter((value): value is string => Boolean(value)).map((value) => new URL(value, location.href).href),
    }));
    for (const link of references.links) {
      const url = new URL(link);
      if (url.origin !== new URL(baseURL!).origin) continue;
      links.add(url.pathname);
      if (url.pathname === new URL(page.url()).pathname && url.hash) {
        expect(await page.locator(`[id="${decodeURIComponent(url.hash.slice(1))}"]`).count(), link).toBe(1);
      }
    }
    for (const asset of references.assets) {
      const url = new URL(asset);
      if (url.origin === new URL(baseURL!).origin) assets.add(url.pathname);
    }
  }
  // ~1,900 unique references: check them in concurrent batches instead of one at a time.
  const references = [...new Set([...links, ...assets])];
  for (let start = 0; start < references.length; start += 50) {
    const batch = references.slice(start, start + 50);
    const statuses = await Promise.all(batch.map(async (path) => [path, (await request.head(path)).status()] as const));
    for (const [path, status] of statuses) expect(status, `Missing local reference: ${path}`).toBe(200);
  }
  await page.goto("/");
  const reachable = await page.locator('a[href^="/projects/"]').evaluateAll((links) => [...new Set(links.map((link) => link.getAttribute("href")))].sort());
  expect(reachable).toEqual(projects.sort());
  expect(projects).toHaveLength(17);
});

test("an unknown URL returns the custom 404 page with noindex", async ({ page }) => {
  const response = await page.goto("/phase2-nonexistent-route/");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
});

for (const path of ["/", "/about/", "/behind-the-scenes/", "/projects/burn/", "/projects/a-long-goodbye/", "/projects/vlinderman/"]) {
  test(`axe accessibility checks on ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) }))).toEqual([]);
  });
}

for (const width of [320, 768]) {
  test(`pages fit a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ["/", "/about/", "/behind-the-scenes/", "/projects/a-long-goodbye/", "/projects/the-tears-of-things/"]) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(width);
      if (width < 1024) await expect(page.locator("#menu-toggle")).toBeVisible();
    }
  });
}

test("reduced motion shows all content and keeps the hero poster without video downloads", async ({ page }) => {
  const videos: string[] = [];
  page.on("request", (request) => { if (/\.mp4(?:\?|$)/.test(request.url())) videos.push(request.url()); });
  await page.goto("/");
  await expect(page.locator("video source[src]")).toHaveCount(0);
  expect(await page.locator(".scroll-cue").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  for (const path of ["/about/", "/behind-the-scenes/", "/projects/burn/"]) {
    await page.goto(path);
    expect(await page.locator("[data-aos]").evaluateAll((els) => els.every((el) => getComputedStyle(el).opacity === "1"))).toBe(true);
  }
  expect(videos).toEqual([]);
});

test("no JavaScript keeps content and mobile navigation available", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await context.route("**/*", (route) => new URL(route.request().url()).origin === new URL(baseURL!).origin ? route.continue() : route.abort());
  const page = await context.newPage();
  try {
    for (const path of ["/", "/about/", "/behind-the-scenes/", "/projects/burn/"]) {
      await page.goto(`${baseURL}${path}`);
      await expect(page.locator('#mobile-menu a[href="/about/"]')).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.locator("[data-aos]").evaluateAll((els) => els.every((el) => getComputedStyle(el).opacity === "1"))).toBe(true);
    }
    await page.locator('#mobile-menu a[href="/about/"]').click();
    await expect(page).toHaveURL(/\/about\/$/);
  } finally { await context.close(); }
});

test("film cards alt text describes every featured image", async ({ page }) => {
  await page.goto("/");
  const cards = await page.locator(".featured-film").evaluateAll((els) => els.map((el) => ({
    slug: el.getAttribute("href")!.split("/").filter(Boolean).pop()!,
    alt: el.querySelector("img")?.getAttribute("alt") ?? null,
  })));
  expect(cards.length).toBe(8);
  for (const { slug, alt } of cards) {
    expect(alt, slug).toBeTruthy();
    const source = readFileSync(`src/content/projects/${slug}.mdx`, "utf8");
    const heroImage = source.match(/^hero:\n\s+image: "(.+)"/m)![1];
    const cardImage = source.match(/^card:\n\s+image: "(.+)"/m)![1];
    const heroAlt = source.match(/^hero:[\s\S]*?\n\s+alt: "(.+)"/m)![1];
    if (heroImage === cardImage) expect(alt, slug).toBe(heroAlt);
  }
});
