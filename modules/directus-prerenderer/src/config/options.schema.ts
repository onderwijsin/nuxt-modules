import {
  directusCollectionPrerenderSchema,
  directusInstanceSchema,
  directusPrerendererSchema
} from "@onderwijsin/nuxt-directus-config/schema";
import { enabled } from "@onderwijsin/nuxt-module-utils/build";
import { z } from "zod";

const directusPrerenderCollectionConfigSchema = z.strictObject({
  collection: z.string().trim().min(1),
  prerender: z.union([
    z.literal(false),
    directusCollectionPrerenderSchema.omit({ mapper: true, fetcher: true })
  ])
});

/** Runtime boundary for directus-prerenderer module configuration. */
export const directusPrerendererOptionsSchema = z.strictObject({
  enabled: enabled.default(true),
  instance: directusInstanceSchema.prefault({}),
  collections: z.array(directusPrerenderCollectionConfigSchema).default([]),
  ...directusPrerendererSchema.shape
});

export type ModuleOptions = z.input<typeof directusPrerendererOptionsSchema>;
export type ResolvedModuleOptions = z.output<typeof directusPrerendererOptionsSchema>;
