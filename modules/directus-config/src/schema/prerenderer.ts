import { z } from "zod";

// Registers the shared Zod sensitivity method used by public config projections.
import "./sensitive";

/** Shared build-time options for Directus prerender route discovery. */
export const directusPrerendererSchema = z
  .object({
    includeStaticSitemapUrls: z.boolean().default(false),
    queryLimit: z.number().int().positive().default(100),
    failureMode: z.enum(["best-effort", "hard-failure"]).default("best-effort")
  })
  .sensitive();

export type DirectusPrerendererOptions = z.input<typeof directusPrerendererSchema>;
export type ResolvedDirectusPrerendererOptions = z.output<typeof directusPrerendererSchema>;
