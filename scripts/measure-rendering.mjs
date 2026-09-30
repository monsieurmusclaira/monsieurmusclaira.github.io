// Short compositor/paint experiment. CPU throttling supplements device checks.
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const baseURL = process.env.PORTFOLIO_MEASURE_URL ?? 'http://127.0.0.1:4321';
const output = process.argv[2];
if (!output) throw new Error('Provide an output JSON path.');
const browser = await chromium.launch();
const results = [];
try {
  for (const [route, override] of [['/', '.grain { display: none !important; }'], ['/behind-the-scenes/', '.polaroid { will-change: auto !important; }']]) {
    for (const variant of ['baseline', 'override']) {
      for (let run = 1; run <= 3; run++) {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'no-preference' });
        await context.route('**/*', (route) => new URL(route.request().url()).origin === new URL(baseURL).origin ? route.continue() : route.abort());
        const page = await context.newPage();
        await page.goto(`${baseURL}${route}`);
        if (variant === 'override') await page.addStyleTag({ content: override });
        for (let y = 0; y <= 5000; y += 500) { await page.evaluate((y) => scrollTo(0, y), y); await page.waitForTimeout(50); }
        await page.waitForLoadState('networkidle');
        await page.evaluate(() => scrollTo(0, 0));
        const session = await context.newCDPSession(page);
        await session.send('Emulation.setCPUThrottlingRate', { rate: 6 });
        let contentLayers = 0;
        session.on('LayerTree.layerTreeDidChange', ({ layers }) => { contentLayers = layers?.filter((layer) => layer.drawsContent).length ?? 0; });
        await session.send('LayerTree.enable');
        const events = [];
        session.on('Tracing.dataCollected', ({ value }) => events.push(...value));
        await session.send('Tracing.start', { categories: 'devtools.timeline', transferMode: 'ReportEvents' });
        const frames = await page.evaluate(() => new Promise((resolve) => {
          const times = [];
          let previous;
          let frame = 0;
          function step(time) {
            if (previous !== undefined) times.push(time - previous);
            previous = time;
            scrollTo(0, frame * 40);
            if (++frame < 120) requestAnimationFrame(step);
            else resolve(times);
          }
          requestAnimationFrame(step);
        }));
        const completed = new Promise((resolve) => session.once('Tracing.tracingComplete', resolve));
        await session.send('Tracing.end');
        await completed;
        results.push({ route, variant, run, contentLayers, paintMilliseconds: events.filter((event) => event.name === 'Paint' && event.ph === 'X').reduce((sum, event) => sum + (event.dur ?? 0), 0) / 1000, framesOver50ms: frames.filter((time) => time > 50).length });
        await context.close();
      }
    }
  }
} finally { await browser.close(); }
writeFileSync(output, `${JSON.stringify(results, null, 2)}\n`);
console.log(`Recorded ${results.length} rendering runs.`);
