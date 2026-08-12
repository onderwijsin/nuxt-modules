import { createError, defineEventHandler, getQuery } from "h3";
import { z } from "zod";
import config from "#directus-sitemaps-config";

import { buildSitemapUrls } from "../utils/sitemap-urls";

const querySchema = z.object({
  collection: z.string().trim().min(1).optional(),
  includeStatic: z.stringbool().default(true)
});

/**
 * Serves @nuxtjs/sitemap source URLs from configured Directus collections.
 *
 * @param event Incoming source request.
 * @returns Best-effort sitemap source entries.
 */
export default defineEventHandler(async (event) => {
  const query = querySchema.safeParse(getQuery(event));
  if (!query.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid sitemap query",
      data: z.treeifyError(query.error)
    });
  }
  return buildSitemapUrls(event, config.collections, config.static, {
    filterByCollection: query.data.collection,
    excludeStaticUrls: !query.data.includeStatic
  });
});
