import { createError, defineEventHandler, setResponseHeader } from "h3";
import type { H3Event } from "h3";
import { attempt, attemptSync } from "@onderwijsin/nuxt-module-utils/shared";
import { parseDocumentPath, parseLocalPath } from "./paths";
import { validateDocumentDefinitions } from "./registry";
import { serializeMarkdownDocument } from "./serialize";
import type { PreparedDocumentDefinition } from "./definition";
import type { MarkdownDocumentService, MarkdownDocumentServiceOptions } from "./types";

/** An explicit application route, retained only for ownership diagnostics. */
export interface ExistingDocumentRoute {
  route: string;
  source: string;
}

/**
 * Matches a literal segment or a named parameter with an optional .md suffix.
 * @param pattern Segment from a document or application route.
 * @param value Encoded segment from a request path.
 * @returns Whether the segment matches.
 */
function matchesSegment(pattern: string, value: string): boolean {
  if (!pattern.startsWith(":")) return encodeURIComponent(pattern) === value;
  const suffix = pattern.endsWith(".md") ? ".md" : "";
  return value.length > suffix.length && value.endsWith(suffix);
}

/**
 * Checks whether two explicit raw routes can claim the same URL.
 * @param document Document representation pattern.
 * @param application Explicit page or Nitro route.
 * @returns Whether the patterns overlap.
 */
function routesOverlap(document: string[], application: string): boolean {
  // Nuxt pages express parameters as :slug(); Nitro uses :slug.
  const segments = application
    .replace(/:([A-Za-z_][A-Za-z0-9_]*)\([^)]*\)[?*+]?/gu, ":$1")
    .split("/");
  if (document.length !== segments.length) return false;

  return document.every((segment, index) => {
    const other = segments[index];
    if (other === undefined) return false;
    if (segment.startsWith(":") && other.startsWith(":")) return true;
    return (
      matchesSegment(segment, encodeURIComponent(other)) ||
      matchesSegment(other, encodeURIComponent(segment))
    );
  });
}

/**
 * Matches a request against one document route.
 * @param route Route pattern segments.
 * @param segments Request path segments.
 * @returns Whether every segment matches.
 */
function matchesRoute(route: string[], segments: string[]): boolean {
  if (route.length !== segments.length) return false;

  for (const [index, pattern] of route.entries()) {
    const value = segments[index];
    if (value === undefined || !matchesSegment(pattern, value)) return false;
  }
  return true;
}

/**
 * Converts a matched Markdown URL into a validated canonical document path.
 * @param requestPath App-relative Markdown path.
 * @param prefix Configured raw prefix.
 * @returns Canonical path suitable for the structured resolver.
 */
function getCanonicalPath(requestPath: string, prefix: string): string {
  const isRoot = requestPath === `${prefix}/index.md`;
  const canonical = isRoot ? "/" : requestPath.slice(prefix.length, -3);
  const parsed = attemptSync(() => parseDocumentPath(canonical));

  if (parsed.data === null) {
    throw createError({ statusCode: 400, statusMessage: "Invalid document path" });
  }
  return parsed.data.path;
}

/**
 * Resolves and serializes a document, translating failures into public HTTP errors.
 * @param path Validated canonical document path.
 * @param event Current request event.
 * @param resolveDocument Application-bound structured resolver.
 * @returns Serialized Markdown for the response.
 */
async function renderDocument(
  path: string,
  event: H3Event,
  resolveDocument: MarkdownDocumentService["resolveMarkdownDocument"]
): Promise<string> {
  const result = await attempt(async () => {
    const document = await resolveDocument(path, { event });
    return { body: document === null ? null : serializeMarkdownDocument(document) };
  });

  if (result.data === null) {
    throw createError({ statusCode: 500, statusMessage: "Document retrieval failed" });
  }
  if (result.data.body === null) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }
  return result.data.body;
}

/**
 * Builds exact raw matchers without reserving a prefix-wide catch-all route.
 * @param definitions Application-owned definitions.
 * @param resolveDocument Structured resolver bound to the application definitions.
 * @param options Application base URL and raw prefix.
 * @param existing Explicit Nitro handlers and pages for collision diagnostics.
 * @returns Middleware that passes through requests outside the declared raw patterns.
 */
export function createMarkdownDocumentHandler(
  definitions: PreparedDocumentDefinition[],
  resolveDocument: MarkdownDocumentService["resolveMarkdownDocument"],
  options: MarkdownDocumentServiceOptions = {},
  existing: ExistingDocumentRoute[] = []
) {
  const prefix = options.rawPrefix ?? "";
  const base = parseLocalPath(options.baseURL ?? "/").path;
  const basePrefix = base === "/" ? "" : base;
  const routes = validateDocumentDefinitions(definitions).map((document) => {
    const canonical = document.definition.route;
    const raw = `${prefix}${canonical === "/" ? "/index" : canonical}.md`;
    const segments = raw.split("/");
    for (const other of existing) {
      if (!other.route.endsWith(".md")) continue;
      if (routesOverlap(segments, other.route)) {
        throw new Error(
          `Markdown document route ${raw} in ${document.source} conflicts with ${other.route} in ${other.source}.`
        );
      }
    }
    return segments;
  });

  return defineEventHandler(async (event) => {
    // Read the original target: URL parsing can normalize traversal before validation.
    const target = event.node.req.originalUrl ?? event.node.req.url ?? "/";
    const pathname = target.split("?")[0] ?? "/";

    if (basePrefix && !pathname.startsWith(`${basePrefix}/`)) return;

    const requestPath = pathname.slice(basePrefix.length);
    const segments = requestPath.split("/");
    if (!routes.some((route) => matchesRoute(route, segments))) return;

    if (event.method !== "GET") {
      setResponseHeader(event, "Allow", "GET");
      throw createError({ statusCode: 405, statusMessage: "Method Not Allowed" });
    }

    const canonicalPath = getCanonicalPath(requestPath, prefix);
    const body = await renderDocument(canonicalPath, event, resolveDocument);

    setResponseHeader(event, "Content-Type", "text/plain; charset=utf-8");
    return body;
  });
}
