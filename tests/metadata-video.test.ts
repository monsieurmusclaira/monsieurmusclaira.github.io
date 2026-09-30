import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';
import { videoSchema, videoDetails } from '../src/lib/videos';
import { publicSocialImage } from '../src/lib/social-images';
import { SITE_NAME, SITE_URL, CONTACT_EMAIL, SOCIAL_LINKS } from '../src/config';

function entities(path: string): any[] {
  const html = readFileSync(path, 'utf8');
  return JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
}
describe('project credits and video metadata', () => {
  for (const file of readdirSync('src/content/projects').filter((f) => f.endsWith('.mdx'))) {
    const source = readFileSync(`src/content/projects/${file}`, 'utf8');
    const data = parse(source.split('---')[1]);
    it(`uses the recorded title and credits for ${file}`, () => {
      const graph = entities(`dist/projects/${file.replace('.mdx', '')}/index.html`);
      const work = graph.find((e) => e['@type'] === (data.schemaType ?? 'Movie'));
      expect(work.name).toBe(data.title);
      expect(work.creditText).toBe(`${SITE_NAME}: ${data.role}`);
      expect(work.contributor).toMatchObject({ '@type': 'Person', '@id': `${SITE_URL}/#person` });
      expect(work).not.toHaveProperty('cinematographer');
      expect(work).not.toHaveProperty('datePublished');
      if (work['@type'] === 'Movie') {
        expect(work).not.toHaveProperty('creator');
        expect(work.director.map((p: any) => p.name)).toEqual(data.director.split(' & '));
      } else {
        expect(work).not.toHaveProperty('director');
        expect(work).not.toHaveProperty('trailer');
        expect(work.creator.map((p: any) => p.name)).toEqual(data.director.split(' & '));
      }
      const videos = work.trailer ?? work.video ?? [];
      expect(videos).toHaveLength(data.videos.length);
      data.videos.forEach((video: any, i: number) => {
        const details = videoDetails(video, data.title);
        expect(videos[i]).toMatchObject({ name: details.name, description: video.description, uploadDate: video.uploadDate, embedUrl: details.embedUrl });
        expect(videos[i].description).not.toBe(data.description);
        expect(videos[i].thumbnailUrl).toMatch(/^https:\/\/victormaes.com\/_astro\//);
      });
    });
  }
  it('keeps identity, contact, and social references consistent', () => {
    for (const route of ['dist/index.html', 'dist/about/index.html', 'dist/behind-the-scenes/index.html']) {
      const page = readFileSync(route, 'utf8');
      expect(page).toContain(`mailto:${CONTACT_EMAIL}`);
      expect(page.toLowerCase()).not.toMatch(/mrmochi|synchronicity/);
      expect(entities(route).find((e) => e['@type'] === 'Person').sameAs).toEqual(Object.values(SOCIAL_LINKS));
    }
  });
  it('keeps BTS media and home filmography under their supported types', () => {
    const gallery = entities('dist/behind-the-scenes/index.html').find((e) => e['@type'] === 'ImageGallery');
    expect(gallery.associatedMedia.length).toBeGreaterThan(0);
    expect(gallery.associatedMedia.every((e: any) => e['@type'] === 'ImageObject')).toBe(true);
    const list = entities('dist/index.html').find((e) => e['@type'] === 'ItemList');
    expect(list.numberOfItems).toBe(17);
    expect(list.itemListElement.map((e: any) => e.position)).toEqual(Array.from({ length: 17 }, (_, i) => i + 1));
  });
});

describe('provider contract', () => {
  it.each([
    { provider: 'youtube', id: 'https://youtube.com/watch?v=M60QLhGWE1g' },
    { provider: 'vimeo', id: '../493296509' },
    { provider: 'youtube', id: 'M60QLhGWE1g', uploadDate: '2023-02-30', uploadDateSource: 'https://youtube.com/' },
    { provider: 'vimeo', id: '493296509', uploadDate: '2020-12-21' },
  ])('rejects unsafe or unverifiable video data %#', (input) => {
    expect(videoSchema.safeParse(input).success).toBe(false);
  });
  it('allows unknown publication dates without manufacturing one', () => {
    const details = videoDetails({ provider: 'vimeo', id: '493296509' }, 'Film');
    expect(details.uploadDate).toBeUndefined();
    expect(details.name).toBe('Film — Trailer');
  });
});

describe('social image sources', () => {
  it('recognizes the checked public poster', () => expect(publicSocialImage('/video/seethrough.jpg')).toEqual({ width: 1800, height: 800 }));
  it('sends managed images through the manifest', () => expect(publicSocialImage('/img/missing.jpg')).toBeUndefined());
  it.each(['/video/missing.jpg', '/elsewhere.jpg', 'https://example.com/image.jpg'])('fails unknown public source %s', (path) => expect(() => publicSocialImage(path)).toThrow('Missing or unregistered'));
});
