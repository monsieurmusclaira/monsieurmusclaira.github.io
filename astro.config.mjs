import { defineConfig, fontProviders } from "astro/config";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: 'https://victormaes.com',
  // Self-hosted fonts: downloaded at build time and served from our own domain,
  // so the browser no longer makes render-blocking round-trips to Google Fonts.
  // The @font-face family names below match the names used in CSS
  // ("Montserrat", "EB Garamond", "Caveat"), so existing styles keep working.
  fonts: [
    {
      provider: fontProviders.google(),
      name: "Montserrat",
      cssVariable: "--font-montserrat",
      weights: [300, 400, 500, 600],
      styles: ["normal"],
    },
    {
      provider: fontProviders.google(),
      name: "EB Garamond",
      cssVariable: "--font-eb-garamond",
      weights: [400, 500, 600],
      styles: ["normal", "italic"],
    },
    {
      provider: fontProviders.google(),
      name: "Caveat",
      cssVariable: "--font-caveat",
      weights: [400],
      styles: ["normal"],
    },
  ],
  integrations: [
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
  vite: {
    plugins: [tailwindcss()]
  }
});
