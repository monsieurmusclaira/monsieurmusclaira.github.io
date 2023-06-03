import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import m2dx from 'astro-m2dx';
import { astroImageTools } from "astro-imagetools";

/** @type {import('astro-m2dx').Options} */
const m2dxOptions = {
  // activate any required feature here
};

// https://astro.build/config
export default defineConfig({
  site: 'https://monsieurmusclaira.github.io',
  integrations: [tailwind(), sitemap(), astroImageTools, mdx()],
  markdown: {
    remarkPlugins: [[m2dx, m2dxOptions]],
    //               ^^^^
    extendDefaultPlugins: true,
  },
});