import { z } from 'zod';

const text = z.string().trim().min(1);
const metadata = {
  title: text.optional(),
  description: text.optional(),
  // Provider publication date, independently verified; never use a film year.
  uploadDate: z.union([z.iso.date(), z.iso.datetime({ offset: true })]).optional(),
  uploadDateSource: z.url().optional(),
};
export const videoSchema = z.discriminatedUnion('provider', [
  z.object({ provider: z.literal('youtube'), id: text.regex(/^[A-Za-z0-9_-]{11}$/, 'Use an eleven-character YouTube video ID.'), ...metadata }),
  z.object({ provider: z.literal('vimeo'), id: text.regex(/^[1-9]\d*$/, 'Use a numeric Vimeo video ID.'), ...metadata }),
]).refine((v) => Boolean(v.uploadDate) === Boolean(v.uploadDateSource), {
  message: 'A publication date and its verification source must be recorded together.',
});
export type Video = z.infer<typeof videoSchema>;

/** One validated provider/ID contract for metadata and the activated player. */
export function videoDetails(input: Video, projectTitle: string) {
  const video = videoSchema.parse(input);
  const title = video.title ?? 'Trailer';
  return {
    ...video,
    title,
    name: `${projectTitle} — ${title}`,
    providerName: video.provider === 'youtube' ? 'YouTube' : 'Vimeo',
    watchUrl: video.provider === 'youtube' ? `https://www.youtube.com/watch?v=${video.id}` : `https://vimeo.com/${video.id}`,
    embedUrl: video.provider === 'youtube' ? `https://www.youtube-nocookie.com/embed/${video.id}` : `https://player.vimeo.com/video/${video.id}`,
  };
}
