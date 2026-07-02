# Portfolio Website

Production repository for my portfolio website: a fast, static, image-heavy film and media portfolio.

Live at [victormaes.com](https://victormaes.com).

## Stack

- **Astro 7** for static site generation, content collections, and view transitions
- **Tailwind CSS 4** and **DaisyUI 5** for styling
- **MDX** for authoring project pages as content
- **Sharp** for build-time image optimization
- **AOS** for scroll animations
- **Self-hosted fonts** (Montserrat, EB Garamond, Caveat), downloaded at build time and served from the site's own domain
- **Vitest** for the test suite
- Deployed to **GitHub Pages** via **GitHub Actions**

## Project structure

```
src/
  assets/        Source images, optimized at build time
  components/    Astro UI components
  content/
    projects/    One MDX file per project (17 films)
  layouts/       Page shells
  lib/           Project ordering, schema, helpers
  pages/         Routes (index, about, behind-the-scenes, 404, projects/[slug])
  styles/        Global CSS
  utils/         Image helpers
scripts/         Build tooling (unused-asset pruning, migration)
tests/           Vitest suite
public/          Static files served as-is (includes CNAME)
```

## Development

Requires Node 20 or newer.

```bash
npm install      # install dependencies
npm run dev      # start the local dev server
npm run build    # build to dist/ and prune unused assets
npm run preview  # preview the production build locally
npm run test     # run the Vitest suite
```

## Content

Each project is a single MDX file in `src/content/projects/`. The frontmatter is validated against a schema (`src/lib/project-schema.ts`), so fields like hero image, gallery, credits, festivals, and awards are type-checked at build time. Add a project by dropping in a new MDX file that matches the schema.

## Deployment

Pushing to `master` triggers a GitHub Actions workflow that builds the site and deploys it to GitHub Pages. The custom domain is set in `public/CNAME`.

## Roadmap

- Implement a better video component in MDX
- Implement a CMS
- Introduce a blog section
