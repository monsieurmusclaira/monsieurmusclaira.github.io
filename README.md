# Portfolio Website

Production repository for my portfolio website: a fast, static, image-heavy film and media portfolio.

Live at [victormaes.com](https://victormaes.com).

## Stack

- **Astro 7** for static site generation, content collections, and view transitions
- **Tailwind CSS 4** and **DaisyUI 5** for styling
- **MDX** for authoring project pages as content
- **Sharp** for build-time image optimization
- **Native CSS and Astro view transitions** for scroll and page animations
- **Self-hosted fonts** (Montserrat, EB Garamond, Caveat), bundled through Fontsource and served from the site's own domain
- **Astro check and TypeScript** for component contracts
- **Vitest** for content, metadata, routes, and asset verification
- **Playwright and axe-core** for browser behavior and accessibility checks
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
tests/           Vitest suite and browser/ Playwright checks
public/          Static files served as-is (includes CNAME)
```

## Development

Development and CI use Node 22.23.3, pinned in `.nvmrc`. Astro requires at least Node 22.12.0.

```bash
nvm use          # select the pinned runtime (when using nvm)
npm ci           # install the locked dependencies
npm run dev      # start the local dev server
npm run build    # build to dist/ and prune unused assets
npm run preview  # preview the production build locally
npm run check    # check Astro and TypeScript contracts
npm run test     # clean-build the site, then run the complete Vitest suite
npx --no-install playwright install chromium  # install the fast-check browser
npm run test:browser                         # desktop and mobile Chromium checks
npx --no-install playwright install firefox webkit
npm run test:browser:all                     # all three browser engines
```

Browser checks require a current production build. They start their own foreground preview at `127.0.0.1:4322`, leaving a preview on port 4321 available. External requests are blocked during tests, including analytics and video providers. Failures retain screenshots and traces in `test-results/` and an HTML report in `playwright-report/`; both directories are ignored by Git. WebKit automation supplements physical-device testing.

## Content

Each project is a single MDX file in `src/content/projects/`. The frontmatter is validated against a schema (`src/lib/project-schema.ts`), so fields like hero image, gallery, credits, festivals, and awards are type-checked at build time. Add a project by dropping in a new MDX file that matches the schema.

Required text must be nonempty. Card order must be a unique positive integer. Known years use four digits; unknown years stay omitted. Videos use supported providers and bare provider-specific IDs. Award photographs need alternative text, and captions need an associated image. Blank credit/spec labels remain valid for continuation rows.

## Images and galleries

The Astro integration generates `.astro/image-manifest.ts` from literal `/img/...` paths in source files and project frontmatter. Keep component image paths literal; missing referenced files fail with their path. The generated file is ignored by Git and recreated by development, checking, and builds. Images load through a memoized lazy lookup, and BTS metadata follows the visible board rather than every source folder.

Gallery thumbnails use sizes matched to grid, wide, full, and Polaroid layouts. Each page shares one native dialog, with Previous/Next, arrow keys, a position counter, captions, and focus restoration. The full-size image loads when opened; with JavaScript disabled, the thumbnail links directly to that image. Asset pruning remains part of production builds, with checks covering thumbnails, full-size links, posters, metadata images, and CSS fonts.

For comparable measurements, run against a production preview with Chromium installed:

```bash
node scripts/measure-gallery.mjs /tmp/gallery-transfer.json
node scripts/measure-rendering.mjs /tmp/gallery-rendering.json
```

Both scripts default to `http://127.0.0.1:4321`; set `PORTFOLIO_MEASURE_URL` for another local preview. Transfer measurements use fresh browser contexts, fixed viewport/DPR settings, and the same scroll sequence. Rendering measurements use a short scroll with 6× CPU throttling; compare overrides against a build containing the original effect. See the [Phase 3 validation record](docs/audits/2026-09-29-phase-3-validation.md) for the measured results and limitations.

## Deployment

Pull requests to `master` run the read-only `verify.yml` workflow: clean install, type checking, production build, Vitest, and desktop/mobile Chromium checks. Weekly Dependabot proposals cover npm patch updates and require manual review.

Updates to `master` or a manual deployment run invoke the same verification workflow with Chromium, Firefox, and WebKit. Only successful verification uploads the Pages artifact; the separate deployment job receives Pages write permissions. Deployments are serialized. Remote publication is MrMochi-only. The custom domain is set in `public/CNAME`.

## Roadmap

- Implement a better video component in MDX
- Implement a CMS
- Introduce a blog section
