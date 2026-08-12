import {
  directusCollectionSchema,
  directusSitemapsSchema
} from "@onderwijsin/nuxt-directus-config/schema";
import { enabled } from "@onderwijsin/nuxt-module-utils/build";
import { z } from "zod";

/** Runtime boundary for directus-sitemaps module configuration. */
export const directusSitemapsOptionsSchema = z.strictObject({
  enabled: enabled.default(true),
  collections: directusCollectionSchema.prefault([]),
  ...directusSitemapsSchema.shape
});
