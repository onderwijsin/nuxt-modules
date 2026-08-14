import { readItems, type Query } from "@directus/sdk";
import {
  getResolvedDirectusConfig,
  type DirectusCollectionConfig,
  type ResolvedDirectusInstanceOptions
} from "@onderwijsin/nuxt-directus-config/schema";
import type { Nuxt } from "@nuxt/schema";
import {
  getDirectusSetupHandlerId,
  withDirectusSetupCache
} from "@onderwijsin/nuxt-module-utils/build";
import {
  createDirectusRestClient,
  hasKey,
  isArray,
  isFunction,
  isRecord,
  isString
} from "@onderwijsin/nuxt-module-utils/shared";

type GenericDirectusSchema = Record<string, Array<Record<string, unknown>>>;
type GenericDirectusQuery = Query<GenericDirectusSchema, GenericDirectusSchema[string][number]>;

type PrerenderCollectionConfig = Omit<DirectusCollectionConfig, "sitemap"> & {
  sitemap?: DirectusCollectionConfig["sitemap"];
};
type EnabledCollectionConfig = Omit<PrerenderCollectionConfig, "prerender"> & {
  prerender: Exclude<DirectusCollectionConfig["prerender"], false>;
};

/**
 * Produces a deterministic representation for fetch configuration cache keys. Callers must
 * preprocess functions, class instances, and other non-serializable values before invoking it.
 *
 * @param value Value to serialize.
 * @returns Stable serialized value for supported primitive, array, and record inputs.
 */
function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

/**
 * Produces the cache identity for a collection fetch, including custom handler identity.
 *
 * @param config Collection configuration.
 * @param instance Directus instance credentials.
 * @returns Stable string cache identity.
 */
function getFetchIdentity(
  config: EnabledCollectionConfig,
  instance: ResolvedDirectusInstanceOptions
): string {
  const { collection, prerender } = config;
  // Handler IDs identify the executable callback; the complete cache key also includes the
  // collection query and instance so distinct fetches cannot collide.
  const fetcher = isFunction(prerender.fetcher)
    ? getDirectusSetupHandlerId(prerender.fetcher)
    : "default";
  return stableSerialize({
    collection,
    fields: prerender.fields ?? ["*"],
    filter: prerender.filter ?? {},
    fetcher,
    instance
  });
}

/**
 * Fetches all records for one collection using its custom or built-in fetcher.
 *
 * @param instance Directus instance credentials.
 * @param config Collection configuration.
 * @param queryLimit Maximum records requested per page.
 * @param failureMode Whether a page failure should abort the build or be ignored.
 * @returns All fetched records.
 */
async function fetchItemsFromCollection(
  instance: ResolvedDirectusInstanceOptions,
  config: EnabledCollectionConfig,
  queryLimit: number,
  failureMode: "best-effort" | "hard-failure"
): Promise<unknown[]> {
  const context = {
    collection: config.collection,
    fields: config.prerender.fields ?? ["*"],
    filter: config.prerender.filter ?? {}
  };

  if (isFunction(config.prerender.fetcher)) return config.prerender.fetcher(context);

  if (!isString(instance.baseUrl) || instance.baseUrl.length === 0) {
    throw new Error("Directus baseUrl is required before prerender routes can be fetched.");
  }

  // Module setup has no Nitro request event, so this client uses the resolved build-time instance
  // directly rather than the request-scoped useDirectusServer composable.
  const client = createDirectusRestClient<GenericDirectusSchema>({
    baseUrl: instance.baseUrl,
    accessToken: instance.staticToken
  });
  const records: unknown[] = [];
  let offset = 0;

  while (true) {
    let page: unknown;
    try {
      page = await client.request(
        readItems<GenericDirectusSchema, string, GenericDirectusQuery>(context.collection, {
          fields: context.fields,
          filter: context.filter,
          limit: queryLimit,
          offset
        })
      );
    } catch (error) {
      if (failureMode === "hard-failure") throw error;
      console.error(
        `Unable to fetch Directus prerender collection page for "${context.collection}" at offset ${offset}.`,
        error
      );
      return records;
    }
    const pageRecords = isArray(page) ? page : [];
    records.push(...pageRecords);
    if (pageRecords.length < queryLimit) return records;
    offset += queryLimit;
  }
}

/**
 * Reads one route value from a fetched Directus item using a declarative field map.
 *
 * @param item Fetched Directus item.
 * @param fieldmap Declarative route field mapping.
 * @returns Mapped route candidate.
 */
function retrieveRouteValueFromItem(item: unknown, fieldmap: { route: string }): unknown {
  return isRecord(item) ? item[fieldmap.route] : undefined;
}

/**
 * Applies the configured mapper or field map and normalizes the result to route strings.
 *
 * @param item Fetched Directus item.
 * @param mapper Optional executable route mapper.
 * @param fieldmap Optional declarative route field mapping.
 * @returns Valid route paths.
 */
function resolveMappedRoutes(
  item: unknown,
  mapper: EnabledCollectionConfig["prerender"]["mapper"],
  fieldmap: EnabledCollectionConfig["prerender"]["fieldmap"]
): string[] {
  const mapped = isFunction(mapper)
    ? mapper(item)
    : fieldmap
      ? retrieveRouteValueFromItem(item, fieldmap)
      : // This also permits custom fetchers to return route strings directly; ordinary Directus
        // records are objects and are rejected by the route guard below.
        item;
  const candidates = isArray(mapped) ? mapped : [mapped];
  return candidates.filter((route): route is string => isString(route) && route.startsWith("/"));
}

/**
 * Builds all prerender routes from Directus collections and optional static sitemap URLs.
 *
 * @param nuxt Active Nuxt instance.
 * @param collections Effective Directus collection configuration.
 * @param options Route-fetching behavior.
 * @returns Discovered unique routes.
 */
export async function buildPrerenderRoutes(
  nuxt: Nuxt,
  collections: PrerenderCollectionConfig[],
  options: {
    instance: ResolvedDirectusInstanceOptions;
    includeStaticSitemapUrls: boolean;
    queryLimit: number;
    failureMode: "best-effort" | "hard-failure";
  }
): Promise<string[]> {
  const selectedCollections = collections.filter(
    (collection): collection is EnabledCollectionConfig => collection.prerender !== false
  );

  // Fetch collections concurrently; the setup cache coalesces duplicate fetch definitions shared
  // with other Directus build-time modules.
  const results = await Promise.allSettled(
    selectedCollections.map(async (collection) => {
      const records = await withDirectusSetupCache(
        nuxt,
        getFetchIdentity(collection, options.instance),
        // Fetch errors reject this collection promise. The settled-results pass below applies
        // best-effort or hard-failure behavior consistently to custom and built-in fetchers.
        () =>
          fetchItemsFromCollection(
            options.instance,
            collection,
            options.queryLimit,
            options.failureMode
          )
      );
      return records.flatMap((record) =>
        resolveMappedRoutes(record, collection.prerender.mapper, collection.prerender.fieldmap)
      );
    })
  );

  // Convert fulfilled collection results into one deduplicated route set and apply the configured
  // failure policy to rejected collection fetches.
  const routes = new Set<string>();
  for (const [index, result] of results.entries()) {
    if (result.status === "fulfilled") {
      for (const route of result.value) routes.add(route);
      continue;
    }

    const collection = selectedCollections[index]?.collection ?? "unknown";
    if (options.failureMode === "hard-failure") throw result.reason;
    console.error(`Unable to build Directus prerender routes for "${collection}".`, result.reason);
  }

  // Static sitemap URLs are an optional sitemap concern and are added after collection routes so
  // both sources share the same deduplication boundary.
  if (options.includeStaticSitemapUrls) {
    const sharedStaticUrls = getResolvedDirectusConfig(nuxt)?.sitemaps?.static;
    const moduleSitemapOptions = hasKey(nuxt.options, "directusSitemaps")
      ? nuxt.options.directusSitemaps
      : undefined;
    const moduleStaticUrls =
      isRecord(moduleSitemapOptions) && isArray(moduleSitemapOptions.static)
        ? moduleSitemapOptions.static.filter(
            (entry): entry is { loc: string } => isRecord(entry) && isString(entry.loc)
          )
        : undefined;
    const staticUrls = moduleStaticUrls ?? sharedStaticUrls ?? [];
    for (const entry of staticUrls) {
      if (entry.loc.startsWith("/")) routes.add(entry.loc);
    }
  }

  return [...routes];
}
