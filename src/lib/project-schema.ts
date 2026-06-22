import { z } from "zod";

export const projectSchema = z.object({
  title: z.string(),
  seoTitle: z.string(),
  description: z.string(),
  director: z.string(),
  genre: z.string(),
  format: z.string(),
  role: z.string(),
  year: z.string().optional(),
  synopsis: z.string(),
  hero: z.object({
    image: z.string(),
    alt: z.string(),
    position: z.string().default("50% 50%"),
    credit: z.string(),
  }),
  card: z.object({
    image: z.string(),
    position: z.string().default("50% 50%"),
    badge1: z.string(),
    badge2: z.string(),
    order: z.number(),
  }),
  featuredAward: z
    .object({ award: z.string(), festival: z.string(), year: z.string().optional() })
    .optional(),
  videos: z
    .array(
      z.object({
        provider: z.enum(["youtube", "vimeo"]),
        id: z.string(),
        title: z.string().optional(),
      }),
    )
    .default([]),
  gallery: z.array(z.object({ image: z.string(), alt: z.string() })).default([]),
  credits: z.array(z.object({ function: z.string(), name: z.string() })).default([]),
  festivals: z.array(z.string()).default([]),
  lists: z.array(z.object({ label: z.string(), items: z.array(z.string()) })).default([]),
  laurels: z.array(z.object({ image: z.string(), alt: z.string() })).default([]),
  awards: z
    .array(z.object({ award: z.string(), festival: z.string(), year: z.string().optional() }))
    .default([]),
  specs: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
});
