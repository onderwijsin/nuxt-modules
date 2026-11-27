import { getRequestURL } from "h3";
import type { H3Event } from "h3";
import { attemptSync } from "@onderwijsin/nuxt-module-utils/shared";
import { parseLocalPath } from "./paths";
import { toPublicLlmsSections } from "./llms";
import type { LlmsSection } from "./llms";
import type { DocumentService } from "./service";
import type { MarkdownDocumentServiceOptions } from "./types";

/** Local structural contract for Nitro's request hook. */
interface RequestHooks {
  hook(name: "request", callback: (event: H3Event) => Promise<void>): unknown;
}

/** Request-local discovery configuration consumed by AI Ready. */
interface AiReadyRuntimeConfig {
  "nuxt-ai-ready"?: {
    llmsTxt?:
      | false
      | {
          sections?: LlmsSection[];
          pages?: false | "sitemap" | "all";
          sitemaps?: string[];
        };
  };
}

/** Section metadata and sitemap discovery supplied by the AI Ready 3.6 plugin. */
interface SitemapDeduplication {
  title: string;
  description?: string;
  fetchSitemapUrlGroups: (
    event: H3Event,
    names?: readonly string[]
  ) => Promise<Map<string, { loc: string }[]>>;
  getSiteUrl: (event: H3Event) => string | undefined;
}

/**
 * Lists local sitemap pages once, excluding routes already listed by a curated document.
 * Comparing app-relative canonical paths lets a prefixed Markdown link match its sitemap URL.
 * @param event The current discovery request, used to read the sitemap and its site context.
 * @param deduplication The configured section and AI Ready sitemap reader.
 * @param base The normalized application base path, or an empty string at the site root.
 * @param curated Document sections with canonical paths before Markdown delivery mapping.
 * @param sitemapNames AI Ready's selected sitemap names. Undefined selects all configured sitemaps.
 * @returns Canonical HTML links labeled with their app-relative paths.
 */
async function listUncuratedSitemapLinks(
  event: H3Event,
  deduplication: SitemapDeduplication,
  base: string,
  curated: Awaited<ReturnType<DocumentService["listLlmsSections"]>>,
  sitemapNames: string[] | undefined
) {
  const listed = new Set(curated.flatMap(({ links }) => links.map(({ path }) => path)));
  const requestOrigin = getRequestURL(event, {
    xForwardedHost: true,
    xForwardedProto: true
  }).origin;
  const siteUrl = deduplication.getSiteUrl(event);
  const siteOrigin = siteUrl ? URL.parse(siteUrl)?.origin : undefined;
  const groups = await deduplication.fetchSitemapUrlGroups(event, sitemapNames);
  const links = [];

  for (const group of groups.values()) {
    for (const { loc } of group) {
      const url = URL.parse(loc, siteOrigin ?? requestOrigin);
      if (
        !url ||
        (url.origin !== siteOrigin && url.origin !== requestOrigin) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash
      ) {
        continue;
      }

      const deployed = attemptSync(() => parseLocalPath(url.pathname).path).data;
      if (!deployed || (deployed !== base && !deployed.startsWith(`${base}/`))) continue;
      const path = deployed.slice(base.length) || "/";
      if (listed.has(path)) continue;
      listed.add(path);
      links.push({ title: path, href: url.href });
    }
  }

  return links;
}

/**
 * Supplies document sections before AI Ready generates its llms.txt response.
 * @param hooks Nitro runtime hooks provided by the generated plugin.
 * @param service Application-bound document service.
 * @param getRuntimeConfig Reads Nitro's mutable configuration for this request only.
 * @param configuration Application base URL and document delivery settings.
 * @param deduplication Opt-in sitemap reader and section metadata.
 */
export function registerMarkdownDocumentAiReady(
  hooks: RequestHooks,
  service: DocumentService,
  getRuntimeConfig: (event: H3Event) => AiReadyRuntimeConfig,
  configuration: MarkdownDocumentServiceOptions = {},
  deduplication?: SitemapDeduplication
): void {
  const baseURL = parseLocalPath(configuration.baseURL ?? "/").path;
  const base = baseURL === "/" ? "" : baseURL;

  hooks.hook("request", async (event) => {
    if (event.method !== "GET" && !(deduplication && event.method === "HEAD")) return;
    const pathname = getRequestURL(event).pathname;
    if (!pathname.startsWith(`${base}/`)) return;
    const path = pathname.slice(base.length);
    // Root and child files share AI Ready's discovery cache.
    if (path !== "/llms.txt" && !(deduplication && /^\/llms\/[^/]+\.txt$/iu.test(path))) return;

    const config = getRuntimeConfig(event)["nuxt-ai-ready"]?.llmsTxt;
    if (!config) return;

    const curated = await service.listLlmsSections({ event });
    config.sections = [...(config.sections ?? []), ...toPublicLlmsSections(curated)];
    if (!deduplication) return;

    const links = await listUncuratedSitemapLinks(
      event,
      deduplication,
      base,
      curated,
      config.sitemaps
    );
    // The deduplicated section takes the place of AI Ready's automatic Pages list.
    config.pages = false;
    if (links.length) {
      config.sections.push({
        title: deduplication.title,
        description: deduplication.description,
        links
      });
    }
  });
}
