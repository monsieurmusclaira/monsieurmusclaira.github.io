import { SITE_URL } from './src/config.ts';
import { defineConfig, fontProviders } from "astro/config";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import portfolioImages from './scripts/image-manifest.mjs';
import { readdirSync, readFileSync } from 'node:fs';

// slug -> `updated` frontmatter date (YYYY-MM-DD), read straight from the MDX.
const projectUpdated = new Map(
  readdirSync('./src/content/projects')
    .filter((file) => file.endsWith('.mdx'))
    .flatMap((file) => {
      const date = readFileSync(`./src/content/projects/${file}`, 'utf8').match(/^updated:\s*["']?(\d{4}-\d{2}-\d{2})/m)?.[1];
      return date ? [[file.replace(/\.mdx$/, ''), date]] : [];
    }),
);
const newestUpdate = [...projectUpdated.values()].sort().at(-1);

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  // Local, lockfile-pinned files: no provider network access during builds.
  fonts: [
    {
      name: 'Montserrat',
      cssVariable: '--font-montserrat',
      provider: fontProviders.local(),
      fallbacks: ['sans-serif'],
      options: { variants: [{
        // Preserve the original 300–600 range (including synthesized bold).
        weight: '300 600', style: 'normal',
        src: ['@fontsource-variable/montserrat/files/montserrat-latin-wght-normal.woff2'],
      }] },
    },
    {
      name: 'EB Garamond',
      cssVariable: '--font-eb-garamond',
      provider: fontProviders.local(),
      fallbacks: ['serif'],
      options: { variants: [
        ...[400, 500, 600].map((weight) => ({
          weight, style: 'normal',
          src: [`@fontsource/eb-garamond/files/eb-garamond-latin-${weight}-normal.woff2`],
        })),
        { weight: 400, style: 'italic', src: ['@fontsource/eb-garamond/files/eb-garamond-latin-400-italic.woff2'] },
      ] },
    },
    {
      name: 'Caveat',
      cssVariable: '--font-caveat',
      provider: fontProviders.local(),
      fallbacks: ['cursive'],
      options: { variants: [{ weight: 400, style: 'normal', src: ['@fontsource/caveat/files/caveat-latin-400-normal.woff2'] }] },
    },
  ],
  integrations: [
    portfolioImages(),
    sitemap({
      // No changefreq/priority (ignored by Google). lastmod comes only from a
      // project's own `updated` date: stamping every URL with the build time
      // tells crawlers nothing and drowns out the signal.
      filter: (page) => !page.includes('/404'),
      serialize: (item) => {
        const { pathname } = new URL(item.url);
        const slug = pathname.match(/^\/projects\/([a-z0-9-]+)\/$/)?.[1];
        const lastmod = slug ? projectUpdated.get(slug) : pathname === '/' ? newestUpdate : undefined;
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
    mdx()
  ],
  prefetch: true,
  image: {
    // Sharp's per-format encoder options. No component passes an explicit
    // `quality`, so this is the effective quality for every generated webp.
    // JPEG is left at default: it only feeds the social-card og:image.
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        webp: { quality: 68 },
      },
    },
  },
  vite: {
    plugins: [tailwindcss()]
  }
});
