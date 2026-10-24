import { SITE_URL } from './src/config.ts';
import { defineConfig, fontProviders } from "astro/config";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import portfolioImages from './scripts/image-manifest.mjs';

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
      changefreq: 'monthly',
      priority: 0.7,
      // No lastmod: stamping every URL with the build time tells crawlers
      // nothing and drowns out the signal.
      filter: (page) => !page.includes('/404'),
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
