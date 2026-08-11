import { z } from "zod";
import "./sensitive";

/** Shared Directus instance credentials. */
export const directusInstanceSchema = z.strictObject({
  baseUrl: z.url().sensitive().optional(),
  staticToken: z.string().sensitive().optional()
});

/** Input type accepted by the shared instance schema. */
export type DirectusInstanceOptions = z.input<typeof directusInstanceSchema>;
/** Resolved type produced by the shared instance schema. */
export type ResolvedDirectusInstanceOptions = z.output<typeof directusInstanceSchema>;
