import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import portfolioImages from './scripts/image-manifest.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://victormaes.com',
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
