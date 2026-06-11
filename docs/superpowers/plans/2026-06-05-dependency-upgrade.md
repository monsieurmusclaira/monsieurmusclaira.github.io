# Dependency Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Astro and all dependencies — including the major Tailwind 3→4 and DaisyUI 4→5 migration — with zero visual or behavioral change to the site.

**Architecture:** Phased upgrade on the current branch. Each phase: change deps → restart dev server → build gate (`npm run build`, 20 pages) → Playwright visual-regression diff vs the Phase 0 baseline → checkpoint for the user to commit. Phases 1–2 are low risk; Phase 3 (Tailwind/DaisyUI) holds essentially all the risk.

**Tech Stack:** Astro 6.4, MDX 6, Tailwind CSS 4 (via `@tailwindcss/vite`), DaisyUI 5, Sass, Playwright (Python) for visual regression.

**Spec:** `docs/superpowers/specs/2026-06-05-dependency-upgrade-design.md`

**Hard rule:** Do NOT run `git commit` or `git push`. The user commits every phase themselves. Each phase ends at a checkpoint where you report results and stop for the user to commit.

**Project root:** `/Users/victormaes/Documents/GitHub-desktop/monsieurmusclaira.github.io` (run all commands from here).

---

## File Structure

Files this plan creates or modifies:

- `/tmp/upgrade/visregress.py` — **create** (temp tooling, not in repo). Playwright screenshot + image-diff harness reused by every phase.
- `package.json` — **modify**. Dependency versions; final `version` bump to `4.0.0`.
- `package-lock.json` — **modify** (via `npm install`).
- `src/styles/global.css` — **modify**. `@tailwind` directives → `@import "tailwindcss"`; add `@plugin` lines for DaisyUI 5 + typography; re-declare the `mytheme` theme; preserve all existing custom CSS.
- `astro.config.mjs` — **modify**. Add the `@tailwindcss/vite` plugin.
- `tailwind.config.cjs` — **delete** (theme + plugins move to CSS under Tailwind 4 / DaisyUI 5).
- `postcss.config.cjs` (if present) — **modify or delete**. Remove `tailwindcss` + `autoprefixer` entries (Vite plugin replaces them).

---

## Task 0: Baseline and visual-regression tooling

**Files:**
- Create: `/tmp/upgrade/visregress.py`

- [ ] **Step 1: Confirm a clean starting point**

Run:
```bash
cd /Users/victormaes/Documents/GitHub-desktop/monsieurmusclaira.github.io
git status --short
node -v && npm -v
npm run build 2>&1 | grep -E "page\(s\)|error" | tail -3
```
Expected: build ends with `20 page(s) built` and `Complete!`, no errors. Note any uncommitted changes (the user may have pending work).

- [ ] **Step 2: Write the visual-regression harness**

Create `/tmp/upgrade/visregress.py` with exactly this content:

```python
import sys, os
from playwright.sync_api import sync_playwright

BASE = "http://localhost:4321"
PAGES = {
    "home": "/",
    "project": "/projects/a-long-goodbye",
    "about": "/about/",
    "bts": "/behind-the-scenes/",
}
OUT = "/tmp/upgrade"

def shoot(label):
    d = os.path.join(OUT, label); os.makedirs(d, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, path in PAGES.items():
            pg = b.new_page(viewport={"width": 1280, "height": 900})
            pg.goto(BASE + path, wait_until="networkidle")
            # settle AOS so scroll-animation state doesn't cause false diffs
            pg.evaluate("document.querySelectorAll('[data-aos]').forEach(e=>{e.style.transform='none';e.style.opacity='1'})")
            pg.wait_for_timeout(400)
            pg.screenshot(path=os.path.join(d, name + ".png"), full_page=True)
            pg.close()
        b.close()
    print("shot", label)

def diff(a, bl):
    from PIL import Image, ImageChops
    da = os.path.join(OUT, a); db = os.path.join(OUT, bl)
    worst = 0.0
    for name in PAGES:
        ia = Image.open(os.path.join(da, name + ".png")).convert("RGB")
        ib = Image.open(os.path.join(db, name + ".png")).convert("RGB")
        if ia.size != ib.size:
            print(f"{name}: SIZE CHANGED {ia.size} -> {ib.size}"); worst = 100.0; continue
        d = ImageChops.difference(ia, ib).convert("L")
        bbox = d.getbbox()
        if not bbox:
            print(f"{name}: identical"); continue
        hist = d.histogram()
        changed = sum(hist[16:])           # pixels differing by more than ~6%
        total = ia.size[0] * ia.size[1]
        pct = 100.0 * changed / total
        worst = max(worst, pct)
        d.save(os.path.join(OUT, f"diff_{a}_vs_{bl}_{name}.png"))
        print(f"{name}: {pct:.2f}% pixels changed, bbox={bbox}")
    print(f"WORST: {worst:.2f}%")

if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "shoot": shoot(sys.argv[2])
    elif cmd == "diff": diff(sys.argv[2], sys.argv[3])
```

- [ ] **Step 3: Ensure the dev server is running on port 4321**

Run:
```bash
pkill -f "astro dev" 2>/dev/null; sleep 1
cd /Users/victormaes/Documents/GitHub-desktop/monsieurmusclaira.github.io
(npm run dev >/tmp/upgrade/dev.log 2>&1 &) ; sleep 6
grep -E "Local|ready" /tmp/upgrade/dev.log | tail -2
```
Expected: `Local http://localhost:4321/`. If it bound to a different port, stop everything, free 4321, and retry — the harness hard-codes 4321.

- [ ] **Step 4: Capture the baseline screenshots**

Run:
```bash
python3 /tmp/upgrade/visregress.py shoot baseline
```
Expected: `shot baseline`, and `/tmp/upgrade/baseline/` contains `home.png`, `project.png`, `about.png`, `bts.png`.

- [ ] **Step 5: Record baseline dep versions**

Run:
```bash
npm ls astro @astrojs/mdx tailwindcss daisyui 2>/dev/null | grep -E "astro@|mdx@|tailwindcss@|daisyui@"
```
Expected: astro@6.3.1, @astrojs/mdx@5.x, tailwindcss@3.4.19, daisyui@4.12.24. Keep this output for comparison. No commit (baseline only).

---

## Task 1: Safe deps + Astro 6.4.4

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install the safe upgrades (pinned)**

Run:
```bash
cd /Users/victormaes/Documents/GitHub-desktop/monsieurmusclaira.github.io
npm install astro@6.4.4 @astrojs/markdown-remark@7.2.0 @astrojs/sitemap@3.7.3 postcss@8.5.15 sass@1.100.0
```
Expected: installs without peer-dependency errors. (If 6.4.4 is no longer the latest 6.x, use the current latest 6.x — do not jump to 7.)

- [ ] **Step 2: Restart the dev server**

Run:
```bash
pkill -f "astro dev" 2>/dev/null; sleep 1
(npm run dev >/tmp/upgrade/dev.log 2>&1 &) ; sleep 6
grep -E "Local|ready|error" /tmp/upgrade/dev.log | tail -3
```
Expected: ready on `http://localhost:4321/`, no errors.

- [ ] **Step 3: Build gate**

Run:
```bash
npm run build 2>&1 | grep -E "page\(s\)|error|warn" | tail -5
```
Expected: `20 page(s) built`, `Complete!`, no errors.

- [ ] **Step 4: Visual regression vs baseline**

Run:
```bash
python3 /tmp/upgrade/visregress.py shoot phase1
python3 /tmp/upgrade/visregress.py diff phase1 baseline
```
Expected: every page `identical` or `WORST` well under `0.50%` (minor anti-aliasing only). If any page shows a real diff, open the saved `/tmp/upgrade/diff_phase1_vs_baseline_<page>.png`, investigate, and fix before continuing.

- [ ] **Step 5: Checkpoint — user commits**

STOP. Report to the user: versions changed, build result (20 pages), and the diff `WORST` percentage. Suggested commit message: `chore: upgrade Astro to 6.4 and safe deps`. Do NOT run git commit yourself — wait for the user.

---

## Task 2: MDX 6

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install MDX 6**

Run:
```bash
npm install @astrojs/mdx@6.0.2
```
Expected: installs clean. If npm reports a peer conflict with `astro@6.4`, check the MDX 6 release notes for the required Astro range; if MDX 6 needs a newer Astro 6.x, bump Astro to that version (stay within 6.x) and re-run.

- [ ] **Step 2: Restart dev server**

Run:
```bash
pkill -f "astro dev" 2>/dev/null; sleep 1
(npm run dev >/tmp/upgrade/dev.log 2>&1 &) ; sleep 6
grep -E "Local|ready|error" /tmp/upgrade/dev.log | tail -3
```
Expected: ready, no errors.

- [ ] **Step 3: Build gate**

Run:
```bash
npm run build 2>&1 | grep -E "page\(s\)|error|warn" | tail -5
```
Expected: `20 page(s) built`, no errors.

- [ ] **Step 4: MDX behavior spot-check — the About email must stay a single styled link**

Run:
```bash
python3 - <<'PY'
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width":1280,"height":900})
    pg.goto("http://localhost:4321/about", wait_until="networkidle")
    links = pg.evaluate("""()=>{
      const sec=[...document.querySelectorAll('section')].find(s=>s.querySelector('a[href^=mailto]'));
      return [...sec.querySelectorAll('a[href^=mailto]')].map(a=>({text:a.textContent.trim(), color:getComputedStyle(a).color, w:Math.round(a.getBoundingClientRect().width)}));
    }""")
    print(links); b.close()
PY
```
Expected: exactly ONE link: text `hello@victormaes.com`, color `oklch(0.956...)` (near-white), width > 0. If TWO links appear, MDX 6 changed GFM auto-link handling — the `{'...'}` guard in `src/pages/about.mdx` needs re-checking (the address must remain inside a JSX expression, not raw markdown text).

- [ ] **Step 5: Visual regression vs baseline**

Run:
```bash
python3 /tmp/upgrade/visregress.py shoot phase2
python3 /tmp/upgrade/visregress.py diff phase2 baseline
```
Expected: identical or `WORST` under `0.50%`.

- [ ] **Step 6: Checkpoint — user commits**

STOP. Report results. Suggested message: `chore: upgrade @astrojs/mdx to 6`. Wait for the user to commit.

---

## Task 3: Tailwind 4 + DaisyUI 5 (highest risk)

**Files:**
- Modify: `src/styles/global.css`, `astro.config.mjs`, `package.json`
- Delete: `tailwind.config.cjs`; `postcss.config.cjs` (if it only configured tailwind/autoprefixer)

- [ ] **Step 1: Read the current styling config so you know what must be preserved**

Run:
```bash
cd /Users/victormaes/Documents/GitHub-desktop/monsieurmusclaira.github.io
cat tailwind.config.cjs
echo "=== postcss config (if any) ==="; cat postcss.config.* 2>/dev/null || echo "no postcss config file"
echo "=== top of global.css ==="; sed -n '1,40p' src/styles/global.css
```
Expected: confirms the `mytheme` colors, the two plugins, `corePlugins.aspectRatio:false`, and the custom CSS blocks in `global.css` (grain filter, `.drop-in*` keyframes, `#credits…` sizing, `html{color-scheme:dark}`, `::selection`, `a{transition}`). These custom blocks MUST survive the migration unchanged.

- [ ] **Step 2: Run the official Tailwind 4 upgrade codemod**

Run:
```bash
git stash list >/dev/null 2>&1   # ensure git is available for the codemod's safety checks
npx @tailwindcss/upgrade --force 2>&1 | tail -40
```
Expected: the tool installs `tailwindcss@4` + `@tailwindcss/postcss` (or prompts for Vite), rewrites `@tailwind` directives in `global.css` to `@import "tailwindcss"`, migrates renamed utilities across `src/`, and may convert/remove `tailwind.config.cjs`. Read its summary output carefully and note every file it changed. NOTE: the codemod handles Tailwind only — DaisyUI is migrated manually in later steps, so expect DaisyUI-related errors until Step 5.

- [ ] **Step 3: Switch Tailwind to the Vite plugin in Astro**

Run:
```bash
npm install @tailwindcss/vite@4
npm uninstall autoprefixer @tailwindcss/postcss 2>/dev/null || true
```

Then edit `astro.config.mjs` to add the Vite plugin. The file must read:

```js
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: 'https://victormaes.com',
  integrations: [
    sitemap({
      changefreq: 'monthly',
      priority: 0.7,
      lastmod: new Date(),
      filter: (page) => !page.includes('/404'),
    }),
    mdx()
  ],
  vite: {
    plugins: [tailwindcss()]
  },
  prefetch: true
});
```

- [ ] **Step 4: Remove the now-redundant PostCSS/Tailwind config**

If a `postcss.config.cjs` (or `.js`) exists and only configured `tailwindcss` + `autoprefixer`, delete it:
```bash
rm -f postcss.config.cjs postcss.config.js
```
If the codemod left a `tailwind.config.cjs` that now only holds the DaisyUI theme, leave it for now — Step 5 moves the theme to CSS, after which you delete it:
```bash
# (run only after Step 5 confirms the theme is migrated)
# rm -f tailwind.config.cjs
```

- [ ] **Step 5: Install DaisyUI 5 and re-declare the theme in CSS**

Run:
```bash
npm install -D daisyui@5
```

Then edit `src/styles/global.css`. The TOP of the file (replacing whatever the codemod produced for the `@import`/font lines) must be:

```css
@import url("https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600&display=swap");
@import url("https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&display=swap");

@import "tailwindcss";
@plugin "@tailwindcss/typography";
@plugin "daisyui" {
  themes: false;
}
@plugin "daisyui/theme" {
  name: "mytheme";
  default: true;
  color-scheme: dark;
  --color-primary: #70AA74;
  --color-secondary: #F1D74E;
  --color-accent: #E08E35;
  --color-neutral: #11131d;
  --color-base-100: #eff0f6;
  --color-info: #3ABFF8;
  --color-success: #36D399;
  --color-warning: #F1D74E;
  --color-error: #D64D42;
}
```

Everything BELOW the original `@tailwind utilities;` line (the custom CSS — `h1,h2` fonts, `th,td`, `.drop-in*` keyframes, `.grain`, `.reveal`, `.stagger-item`, `#credits…` sizing, `a{transition}`, `::selection`, `html{color-scheme:dark}`) must remain present and unchanged. Verify nothing was dropped.

**Verification note:** DaisyUI 5's exact `@plugin "daisyui/theme"` property names can shift between minor releases. If the build (Step 7) errors on the theme block, consult the current DaisyUI 5 docs (via the context7 MCP for "daisyui", or https://daisyui.com/docs/themes/) and adjust the property syntax — keep the same hex values. This is the one step most likely to need a doc check.

- [ ] **Step 6: Restart the dev server**

Run:
```bash
pkill -f "astro dev" 2>/dev/null; sleep 1
(npm run dev >/tmp/upgrade/dev.log 2>&1 &) ; sleep 7
grep -E "Local|ready|error|Error" /tmp/upgrade/dev.log | tail -8
```
Expected: ready, no errors. If you see unknown-utility errors, they are usually renamed Tailwind 4 utilities the codemod missed — note the class and fix its usage in `src/`.

- [ ] **Step 7: Build gate**

Run:
```bash
npm run build 2>&1 | grep -E "page\(s\)|error|Error|warn" | tail -10
```
Expected: `20 page(s) built`, `Complete!`, no errors. Fix any reported errors (most likely: unknown utilities, the theme block syntax from Step 5, or a missing `@plugin`).

- [ ] **Step 8: Visual regression vs baseline**

Run:
```bash
python3 /tmp/upgrade/visregress.py shoot phase3
python3 /tmp/upgrade/visregress.py diff phase3 baseline
```
Expected: identical or near-zero. Because Tailwind 4 changes some defaults, watch specifically for these regressions and fix them:
- **Borders invisible or wrong color** — Tailwind 4's default border color is `currentColor`, not gray. The thin separators (`border-t border-base-100/10` in CreditsItem/AwardItem) explicitly set a color, so they should be fine; if any bare `border` lost its color, add an explicit `border-base-100/10`.
- **Semantic colors wrong** (`text-base-100`, `text-secondary`, `text-warning`, `bg-neutral`) — means the `mytheme` theme block didn't apply; re-check Step 5.
- **`prose` block in the hero** — confirm the typography `@plugin` loaded.
- Open any `diff_phase3_vs_baseline_*.png` that shows changes and resolve each before continuing.

- [ ] **Step 9: Interactive component spot-check**

Run:
```bash
python3 - <<'PY'
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1280,"height":900})
    checks={}
    pg.goto("http://localhost:4321/", wait_until="networkidle")
    checks["nav_work_link_color"]=pg.eval_on_selector('nav a, .navbar a', "e=>getComputedStyle(e).color")
    checks["filmcard_title_color"]=pg.eval_on_selector('h2.text-warning, .text-warning', "e=>getComputedStyle(e).color")
    pg.goto("http://localhost:4321/projects/a-long-goodbye", wait_until="networkidle")
    checks["scroll_arrow_present"]=bool(pg.query_selector('svg.animate-bounce'))
    checks["lightbox_dialog_present"]=bool(pg.query_selector('dialog.lightbox'))
    print(checks); b.close()
PY
```
Expected: nav and title colors are real values (yellow `#F1D74E` shows as `oklch`/`rgb` light-yellow), arrow and lightbox present. Then manually confirm in a browser (`http://localhost:4321/`): nav hover turns yellow, a FilmCard hover zoom + focus ring work, badges render outlined, and clicking a project still image opens the lightbox.

- [ ] **Step 10: Delete the dead Tailwind 3 config**

Once Steps 7–9 pass, remove the old JS config (theme now lives in CSS):
```bash
rm -f tailwind.config.cjs
npm run build 2>&1 | grep -E "page\(s\)|error" | tail -3
```
Expected: still `20 page(s) built` with the config removed. If the build now fails, the config was still providing something (e.g. `content` paths) — restore it via `@config "./tailwind.config.cjs";` in `global.css` instead, and note why.

- [ ] **Step 11: Checkpoint — user commits**

STOP. Report: deps changed, build result, diff `WORST` percent per page, and the component spot-check. Suggested message: `chore: migrate to Tailwind 4 and DaisyUI 5`. Wait for the user to commit.

---

## Task 4: Cleanup, version bump, final verification

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Remove unused plugins**

Check whether `@tailwindcss/aspect-ratio` is still referenced anywhere:
```bash
grep -rn "aspect-ratio\|aspectRatio\|@tailwindcss/aspect-ratio" src/ astro.config.mjs 2>/dev/null
```
If there are no `aspect-*` utility usages in `src/` (aspect-ratio is core in Tailwind 4), remove the plugin:
```bash
npm uninstall @tailwindcss/aspect-ratio
```
If it IS used, leave it installed and add `@plugin "@tailwindcss/aspect-ratio";` to `global.css`.

- [ ] **Step 2: Bump the site version to 4.0.0**

Edit `package.json`: change `"version": "3.7.1"` to `"version": "4.0.0"`.

- [ ] **Step 3: Final build gate**

Run:
```bash
npm run build 2>&1 | grep -E "page\(s\)|error|Error|warn" | tail -5
```
Expected: `20 page(s) built`, `Complete!`, no warnings or errors.

- [ ] **Step 4: Final visual regression vs the original baseline**

Run:
```bash
python3 /tmp/upgrade/visregress.py shoot final
python3 /tmp/upgrade/visregress.py diff final baseline
```
Expected: every page identical or `WORST` well under `0.50%`. This is the whole point of the upgrade — the site looks the same. Investigate any page that drifted.

- [ ] **Step 5: Confirm final dependency versions**

Run:
```bash
npm ls astro @astrojs/mdx @astrojs/sitemap tailwindcss daisyui 2>/dev/null | grep -E "astro@|mdx@|sitemap@|tailwindcss@|daisyui@"
```
Expected: astro@6.4.x, @astrojs/mdx@6.x, tailwindcss@4.x, daisyui@5.x.

- [ ] **Step 6: Checkpoint — user commits**

STOP. Report final versions, build result, and final diff. Suggested message: `chore: cleanup deps and bump to v4.0.0`. Wait for the user to commit. Optionally remind the user they can `rm -rf /tmp/upgrade` to clear the temp screenshots.

---

## Self-Review (completed by plan author)

- **Spec coverage:** Phase 0→Task 0; Phase 1→Task 1; Phase 2→Task 2; Phase 3→Task 3; Phase 4→Task 4. Build gate + visual regression appear in every phase. The About-email MDX risk (spec Phase 2) is covered by Task 2 Step 4. The Tailwind 4 breaking-change audit (spec Phase 3.6) is covered by Task 3 Step 8. Theme-color preservation is covered by Task 3 Step 5 with exact hexes. All spec sections map to a task.
- **Placeholders:** None. The one doc-dependent item (DaisyUI 5 theme syntax) is a concrete "build, and if it errors, consult these specific docs and adjust" step, not a TBD.
- **Consistency:** The harness label names (`baseline`, `phase1`, `phase2`, `phase3`, `final`) and the `shoot`/`diff` commands are used consistently across all tasks. Port 4321 is used everywhere. The commit rule (user-only) is repeated at every checkpoint.
