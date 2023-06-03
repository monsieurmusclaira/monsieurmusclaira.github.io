import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import { astroImageTools } from "astro-imagetools";
import netlify from "@astrojs/netlify/functions";

// https://astro.build/config
export default defineConfig({
  site: 'https://monsieurmusclaira.github.io',
  integrations: [tailwind(), sitemap(), astroImageTools, mdx()],
  markdown: {},
  output: "server",
  adapter: netlify()
});