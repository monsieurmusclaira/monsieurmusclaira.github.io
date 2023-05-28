import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import image from "@astrojs/image";
import mdx from "@astrojs/mdx";
import partytown from "@astrojs/partytown";
// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), sitemap(), image({serviceEntryPoint: '@astrojs/image/sharp'}), mdx(),
  partytown({
    // Adds dataLayer.push as a forwarding-event.
    config: {
      forward: ["dataLayer.push"],
    },
  }),
], 
  markdown: {
  },
});