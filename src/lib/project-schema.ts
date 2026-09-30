import { z } from "zod";
import { videoSchema } from "./videos";

const text = z.string().trim().min(1, "This field must not be blank.");
const year = text.regex(/^[1-9]\d{3}$/, "Use a four-digit year.");

export const projectSchema = z.object({
  title: text,
  seoTitle: text,
  description: text,
  director: text,
  genre: text,
  format: text,
  role: text,
  year: year.optional(),
  // Overrides the JSON-LD @type for the project (defaults to "Movie"). Use for
  // pieces that are not films, e.g. "CreativeWork" for the interactive VR work.
  schemaType: z.enum(["Movie", "CreativeWork"]).optional(),
  synopsis: text,
  hero: z.object({
    image: text,
    alt: text,
    position: text.default("50% 50%"),
    credit: text,
  }),
  card: z.object({
    image: text,
    position: text.default("50% 50%"),
    badge1: text,
    badge2: z.string(),
    order: z.number().int().positive(),
    desc: text.optional(),
  }),
  featuredAward: z
    .object({
      award: text,
      festival: text,
      year: year.optional(),
      // Optional photo shown under the award banner (e.g. the ceremony).
      image: text.optional(),
      imageAlt: text.optional(),
      caption: text.optional(),
    })
    .superRefine((award, context) => {
      if (award.image && !award.imageAlt) {
        context.addIssue({ code: "custom", path: ["imageAlt"], message: "An award image needs descriptive alternative text." });
      }
      if (!award.image && (award.imageAlt || award.caption)) {
        context.addIssue({ code: "custom", path: ["image"], message: "Image text and captions need an award image." });
      }
    })
    .optional(),
  videos: z.array(videoSchema).default([]),
  gallery: z
    .array(
      z.object({
        image: text,
        alt: text,
        // Optional editorial controls; existing image/alt-only galleries remain valid.
        caption: text.optional(),
        layout: z.enum(["grid", "wide", "full"]).optional(),
      }),
    )
    .default([]),
  // Blank labels intentionally continue a group; names and values must be present.
  credits: z.array(z.object({ function: z.string(), name: text })).default([]),
  festivals: z.array(text).default([]),
  lists: z.array(z.object({ label: text, items: z.array(text) })).default([]),
  laurels: z.array(z.object({ image: text, alt: text })).default([]),
  awards: z
    .array(z.object({ award: text, festival: text, year: year.optional() }))
    .default([]),
  specs: z.array(z.object({ label: z.string(), value: text })).default([]),
});
