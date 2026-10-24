// Bounded encoder experiment using the same Sharp implementation as Astro.
// node scripts/compare-image-formats.mjs <output-directory>
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

const output = process.argv[2];
if (!output) throw new Error('Provide an output directory.');
mkdirSync(output, { recursive: true });
const samples = {
  dark: 'src/assets/img/burn/stills/20231102_BURN_1.1.30.jpg',
  grain: 'src/assets/img/thetearsofthings/stills/TTOT_20221008_1.19.1.jpg',
  daylight: 'src/assets/img/worldwoodweb/stills/worldwoodwebcover.jpg',
  portrait: 'src/assets/img/about/IMG_2507-unblur.jpg',
};
const results = [];
for (const [sample, source] of Object.entries(samples)) {
  for (const width of sample === 'portrait' ? [320, 640, 1080, 2560] : [1080, 2560]) {
    for (const format of ['webp', 'avif']) {
      const times = [];
      let buffer;
      for (let run = 0; run < 3; run++) {
        const start = performance.now();
        buffer = await sharp(source).resize({ width, withoutEnlargement: true })[format]({ quality: format === 'webp' ? 68 : 50 }).toBuffer();
        times.push(performance.now() - start);
      }
      const file = `${sample}-${width}.${format}`;
      writeFileSync(join(output, file), buffer);
      // Same crop from each decoded candidate for visual quality review.
      const metadata = await sharp(buffer).metadata();
      await sharp(buffer).extract({ left: Math.max(0, Math.floor(metadata.width / 2) - 256), top: Math.max(0, Math.floor(metadata.height / 2) - 180), width: Math.min(512, metadata.width), height: Math.min(360, metadata.height) }).png().toFile(join(output, `${sample}-${width}-${format}-crop.png`));
      results.push({ sample, source, width, actualWidth: metadata.width, format, bytes: buffer.length, encodeMilliseconds: times, medianEncodeMilliseconds: [...times].sort((a,b) => a-b)[1] });
    }
  }
}
writeFileSync(join(output, 'encoders.json'), `${JSON.stringify({ sharp: sharp.versions, results }, null, 2)}\n`);
console.log(results.map(({ sample, width, format, bytes, medianEncodeMilliseconds }) => ({ sample, width, format, bytes, milliseconds: Math.round(medianEncodeMilliseconds) })));
