// Run via: npm exec --package=lighthouse@13.0.3 -- node scripts/measure-performance.mjs /tmp/performance.json
// Uses only a local production preview; never sends these pages to a service.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
const run = promisify(execFile);
const baseURL = process.env.PORTFOLIO_MEASURE_URL ?? 'http://127.0.0.1:4321';
if (!['127.0.0.1', 'localhost'].includes(new URL(baseURL).hostname)) throw new Error('Performance measurements require a local production preview.');
const output = process.argv[2];
if (!output) throw new Error('Provide an output JSON path.');
const scratch = mkdtempSync(join(tmpdir(), 'portfolio-lighthouse-'));
const results = process.env.PORTFOLIO_MEASURE_RESUME === 'true' ? JSON.parse(readFileSync(output, 'utf8')) : [];
try {
  for (const route of ['/', '/projects/ever-since-i-have-been-flying/', '/behind-the-scenes/', '/about/']) {
    for (let repeat = 1; repeat <= 3; repeat++) {
      if (results.some((result) => result.route === route && result.run === repeat)) continue;
      const report = join(scratch, 'report.json');
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await run('lighthouse', [`${baseURL}${route}`, '--quiet', '--only-categories=performance', '--output=json', `--output-path=${report}`, '--chrome-flags=--headless --no-sandbox', '--throttling-method=simulate', '--screenEmulation.width=390', '--screenEmulation.height=844', '--screenEmulation.deviceScaleFactor=2', ...['*google*', '*vimeo*', '*youtube*', '*ytimg*', '*doubleclick*'].map((pattern) => `--blocked-url-patterns=${pattern}`)], { env: { ...process.env, CHROME_PATH: chromium.executablePath() }, maxBuffer: 4 * 1024 * 1024 });
          break;
        } catch (error) {
          if (attempt === 3 || !/Target closed|Connection closed/.test(error.stderr ?? '')) throw error;
          console.warn(`Chrome closed during ${route} run ${repeat}; retrying (${attempt}/2).`);
        }
      }
      const data = JSON.parse(readFileSync(report, 'utf8'));
      if (data.runtimeError) throw new Error(`${route}: ${data.runtimeError.message}`);
      const external = data.audits['network-requests'].details.items.filter((request) => new URL(request.url).origin !== new URL(baseURL).origin && /^https?:/.test(request.url));
      if (external.some((request) => request.statusCode > 0 || request.transferSize > 0)) throw new Error('A third-party request escaped the isolation rules. Discard this run.');
      const audit = (id) => data.audits[id].numericValue;
      results.push({ route, run: repeat, lcpMilliseconds: audit('largest-contentful-paint'), cls: audit('cumulative-layout-shift'), tbtMilliseconds: audit('total-blocking-time'), transferBytes: audit('total-byte-weight'), lighthouseVersion: data.lighthouseVersion, settings: { throttlingMethod: data.configSettings.throttlingMethod, throttling: data.configSettings.throttling, screenEmulation: data.configSettings.screenEmulation, blockedUrlPatterns: data.configSettings.blockedUrlPatterns }, externalRequests: external.map(({ url, statusCode, transferSize }) => ({ url, statusCode, transferSize })), warnings: data.runWarnings });
      // Save after each run so interrupted measurements remain inspectable.
      writeFileSync(output, `${JSON.stringify(results, null, 2)}\n`);
      console.log(`${route} ${repeat}/3: LCP ${results.at(-1).lcpMilliseconds.toFixed(0)}ms, CLS ${results.at(-1).cls.toFixed(3)}, TBT ${results.at(-1).tbtMilliseconds.toFixed(0)}ms`);
    }
  }
} finally { rmSync(scratch, { recursive: true, force: true }); }
