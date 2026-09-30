import { test, expect, navigate } from "./fixtures";

for (const [path, target] of [["/", "selected-work"], ["/about/", "project-intro"], ["/behind-the-scenes/", "bts-board"]]) {
  test(`hero cue scrolls to content on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.getByRole("link", { name: path === "/" ? "Scroll to selected work" : "Scroll to continue", exact: true }).click();
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
    await expect.poll(() => page.locator(`#${target}`).evaluate((el) => el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(64);
    await expect.poll(() => page.locator(`#${target}`).evaluate((el) => el.getBoundingClientRect().top)).toBeLessThan(120);
  });
}

test("mobile menu closes with Escape, resets after navigation and follows breakpoints", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.locator("#menu-toggle");
  const menu = page.locator("#mobile-menu");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(menu).toBeVisible();
  await menu.getByRole("link", { name: "About", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(menu).toBeHidden();
  await toggle.click();
  await menu.getByRole("link", { name: "About", exact: true }).click();
  await expect(page).toHaveURL(/\/about\/$/);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await menu.getByRole("link", { name: "About", exact: true }).focus();
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.locator('#desktop-links a[aria-current="page"]')).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await page.setViewportSize({ width: 768, height: 844 });
  await expect(toggle).toBeFocused();
  await toggle.click();
  await page.locator("main h1").click();
  await expect(menu).toBeHidden();
});

test("header stays visible while focused or its menu is open", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.locator("header .navbar-center a").focus();
  await page.evaluate(() => scrollTo(0, 600));
  await expect.poll(() => page.locator("header").evaluate((el) => el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#menu-toggle").click();
  await page.evaluate(() => scrollTo(0, 1000));
  await expect(page.locator("#mobile-menu")).toBeVisible();
  await expect.poll(() => page.locator("header").evaluate((el) => el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);
});

for (const path of ["/projects/burn/", "/behind-the-scenes/"]) {
  test(`gallery traps focus, restores it and unlocks scrolling on ${path}`, async ({ page }) => {
    await page.goto(path);
    const trigger = page.getByRole("button", { name: /^View full size:/ }).first();
    await trigger.scrollIntoViewIfNeeded();
    const dialog = page.locator("dialog[open]");
    for (const closeMethod of ["Escape", "button", "backdrop"]) {
      await trigger.click();
      await expect(dialog).toBeVisible();
      const close = dialog.getByRole("button", { name: "Close image" });
      await expect(close).toBeFocused();
      for (const key of ['Tab', 'Tab', 'Tab', 'Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab']) {
        await page.keyboard.press(key);
        expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
      }
      const lockedY = await page.evaluate(() => scrollY);
      await page.mouse.wheel(0, 300);
      await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).overflowY)).toBe("hidden");
      expect(await page.evaluate(() => scrollY)).toBe(lockedY);
      if (closeMethod === "Escape") await page.keyboard.press("Escape");
      else if (closeMethod === "button") await close.click();
      else await page.mouse.click(2, 2);
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).overflowY)).not.toBe("hidden");
    }
  });
}

test("project contact CTA reaches the visible contact section", async ({ page }) => {
  await page.goto("/projects/burn/");
  await page.getByRole("link", { name: "Discuss a project" }).click();
  await expect(page).toHaveURL(/\/about\/#contact$/);
  await expect.poll(() => page.locator("#contact").evaluate((el) => el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(64);
  await expect.poll(() => page.locator("#contact").evaluate((el) => el.getBoundingClientRect().top)).toBeLessThan(120);
});

test("back and forward retain usable navigation and galleries", async ({ page }) => {
  await page.goto("/");
  await navigate(page, () => page.locator('a[href="/projects/burn/"]').first().click());
  await expect(page).toHaveURL(/\/projects\/burn\/$/);
  await navigate(page, () => page.getByRole("link", { name: "Discuss a project" }).click());
  await expect(page).toHaveURL(/\/about\/#contact$/);
  await navigate(page, () => page.goBack());
  await expect(page).toHaveURL(/\/projects\/burn\/$/);
  const trigger = page.getByRole("button", { name: /^View full size:/ }).first();
  await expect.poll(() => trigger.evaluate((el) => el.getBoundingClientRect().width)).toBeGreaterThan(0);
  await trigger.click();
  await expect(page.locator("dialog[open]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await navigate(page, () => page.goForward());
  await expect(page).toHaveURL(/\/about\/#contact$/);
  if (page.viewportSize()!.width < 1024) {
    await page.locator("#menu-toggle").click();
    await expect(page.locator("#mobile-menu")).toBeVisible();
    await page.keyboard.press("Escape");
  } else {
    await page.locator('#desktop-links a[href="/"]').focus();
    await expect(page.locator('#desktop-links a[href="/"]')).toBeFocused();
  }
});
