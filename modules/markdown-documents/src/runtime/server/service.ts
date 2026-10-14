import { createError } from "h3";
import { z } from "zod";
import { attemptSync, fromEntries, isDefined } from "@onderwijsin/nuxt-module-utils/shared";
import { parseDocumentRoute, validateDocumentDefinitions } from "./registry";
import { parseDocumentPath, parseLocalPath } from "./paths";
import type { DocumentPath } from "./paths";
import type { PreparedDocumentDefinition } from "./definition";
import type {
  MarkdownDocumentListItem,
  MarkdownDocumentService,
  MarkdownDocumentServiceOptions
} from "./types";

const listingSchema = z.array(
  z.object({
    title: z.string().refine((value) => value.trim().length > 0),
    path: z.string(),
    description: z.string().optional()
  })
);

/**
 * Matches decoded path segments and extracts named parameters.
 * @param pattern Validated route pattern segments.
 * @param path Validated canonical path.
 * @returns Parameters for a match, or null when the route does not match.
 */
function matchRoute(pattern: string[], path: DocumentPath): Record<string, string> | null {
  if (pattern.length !== path.segments.length) return null;
  const params: [string, string][] = [];
  for (const [index, segment] of pattern.entries()) {
    const value = path.segments[index];
    if (!isDefined(value)) return null;
    if (segment.startsWith(":")) params.push([segment.slice(1), value]);
    else if (segment !== value) return null;
  }
  return fromEntries(params);
}

/**
 * Creates the application-bound service shared by generated server utilities.
 * @param definitions Typed definitions prepared individually before collection.
 * @param options Base URL and optional Markdown prefix from Nuxt configuration.
 * @returns Structured resolution, metadata listing and URL derivation utilities.
 */
export function createMarkdownDocumentService(
  definitions: PreparedDocumentDefinition[],
  options: MarkdownDocumentServiceOptions = {}
): MarkdownDocumentService {
  const documents = validateDocumentDefinitions(definitions).map((entry) => ({
    ...entry,
    segments: parseDocumentRoute(entry.definition.route)
  }));
  const baseURL = parseLocalPath(options.baseURL ?? "/").path;
  const rawPrefix = options.rawPrefix ? parseLocalPath(options.rawPrefix).path : "/";
  const prefix = `${baseURL === "/" ? "" : baseURL}${rawPrefix === "/" ? "" : rawPrefix}`;

  const findDocument = (path: DocumentPath) => {
    for (const document of documents) {
      const params = matchRoute(document.segments, path);
      if (params !== null) return { document, params };
    }
    return null;
  };

  return {
    async resolveMarkdownDocument(path, context = {}) {
      const match = findDocument(parseDocumentPath(path));
      if (!match) return null;
      return match.document.resolve({ ...context, params: match.params });
    },

    async listMarkdownDocuments(context) {
      const entries = new Map<string, MarkdownDocumentListItem>();
      for (const document of documents) {
        const listing = await document.list(context);
        const parsed = attemptSync(() => listingSchema.safeParse(listing));
        if (parsed.data === null || !parsed.data.success) {
          throw createError({
            statusCode: 500,
            message: `Invalid Markdown document listing in ${document.source}. Expected title, canonical path and optional description.`
          });
        }
        for (const item of parsed.data.data) {
          const canonical = attemptSync(() => parseDocumentPath(item.path));
          if (canonical.data === null || findDocument(canonical.data)?.document !== document) {
            throw createError({
              statusCode: 500,
              message: `Invalid or unowned listing path in ${document.source}.`
            });
          }
          const normalized = { ...item, path: canonical.data.path };
          const previous = entries.get(normalized.path);
          if (
            previous &&
            (previous.title !== normalized.title || previous.description !== normalized.description)
          ) {
            throw createError({
              statusCode: 500,
              message: `Conflicting document listing metadata in ${document.source}.`
            });
          }
          entries.set(normalized.path, normalized);
        }
      }
      return [...entries.values()];
    },

    getMarkdownDocumentURL(path) {
      const canonical = parseDocumentPath(path).path;
      return `${prefix}${canonical === "/" ? "/index" : canonical}.md`;
    }
  };
}
