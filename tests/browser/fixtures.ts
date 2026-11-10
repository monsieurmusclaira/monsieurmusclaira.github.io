import { test as base, expect, type Page } from "@playwright/test";

export const test = base.extend({
  context: async ({ context, baseURL }, use) => {
    if (!baseURL) throw new Error("Browser tests require a local baseURL.");
    const origin = new URL(baseURL).origin;
    // Exercise the portfolio without contacting analytics or media providers.
    await context.route("**/*", (route) => {
      if (new URL(route.request().url()).origin === origin) return route.continue();
      return route.abort();
    });
    await use(context);
  },
});

export { expect };

export function primaryFamily(list: string): string {
  return list.split(',')[0].trim();
}

export async function navigate(page: Page, action: () => Promise<unknown>) {
  // History updates can precede the DOM swap. Wait for Astro's completion event.
  await Promise.all([
    page.evaluate(() => new Promise<void>((resolve) => document.addEventListener("astro:page-load", () => resolve(), { once: true }))),
    action(),
  ]);
}
