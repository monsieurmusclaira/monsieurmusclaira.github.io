import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const home = "dist/index.html";

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

// Every asset URL a built page points at: src, href, each srcset candidate,
// and the absolute meta/JSON-LD image URLs.
function assetUrls(pageHtml: string): string[] {
  const urls = new Set<string>();
  for (const m of pageHtml.matchAll(/(?:src|href|poster|data-src)="([^"]+)"/g)) urls.add(m[1]);
  for (const m of pageHtml.matchAll(/srcset="([^"]+)"/g)) {
    for (const part of m[1].split(",")) urls.add(part.trim().split(/\s+/)[0]);
  }
  for (const m of pageHtml.matchAll(/"(https:\/\/victormaes\.com\/[^"]+)"/g)) urls.add(m[1]);
  return [...urls];
}

// Percent-decode; a lone `%` is a literal, not an escape.
function decode(url: string): string {
  return url.replace(/(?:%[0-9A-Fa-f]{2})+/g, (seq) => {
    try {
      return decodeURIComponent(seq);
    } catch {
      return seq;
    }
  });
}

describe("built-site asset integrity", () => {
  beforeAll(() => {
    if (!existsSync(home)) throw new Error("Run `npm run build` before the asset tests.");
  });

  it("every asset URL referenced by built HTML resolves to a file in dist/", () => {
    const missing: string[] = [];
    for (const page of walk("dist").filter((f) => f.endsWith(".html"))) {
      for (const raw of assetUrls(readFileSync(page, "utf-8"))) {
        const url = decode(raw).replace("https://victormaes.com", "");
        // Only local file references. Skip protocol/anchor/route URLs and
        // directory routes (which are served by their own index.html).
        if (!url.startsWith("/")) continue;
        if (!/\.[a-z0-9]+$/i.test(url)) continue;
        if (url.endsWith(".html")) continue;
        const onDisk = join("dist", url.slice(1));
        if (!existsSync(onDisk)) missing.push(`${page} -> ${url}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('every local CSS font/image reference resolves after pruning', () => {
    const missing: string[] = [];
    for (const file of walk('dist').filter((file) => file.endsWith('.css'))) {
      const css = readFileSync(file, 'utf8');
      for (const match of css.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/g)) {
        const raw = decode(match[1]);
        if (/^(?:https?:|data:|#)/.test(raw)) continue;
        const path = raw.startsWith('/') ? join('dist', raw.slice(1)) : join(file.slice(0, file.lastIndexOf('/')), raw);
        if (!existsSync(path.split(/[?#]/)[0])) missing.push(`${file} -> ${raw}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
