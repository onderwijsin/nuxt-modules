import { createError, defineEventHandler, setResponseHeader } from "h3";
import type { App, EventHandler, H3Event } from "h3";
import { attempt, attemptSync } from "@onderwijsin/nuxt-module-utils/shared";
import { parseDocumentPath, parseLocalPath } from "./paths";
import { validateDocumentDefinitions } from "./registry";
import { serializeMarkdownDocument } from "./serialize";
import type { PreparedDocumentDefinition } from "./definition";
import type { MarkdownDocumentService, MarkdownDocumentServiceOptions } from "./types";

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
 * Builds a scoped H3 layer for one raw document route.
 * @param rawPath Raw route pattern, including base URL, prefix and .md suffix.
 * @param handler Shared document response handler.
 * @returns A layer with a static mount path and an exact matcher for its remaining path.
 */
function createDocumentRouteLayer(rawPath: string, handler: EventHandler): App["stack"][number] {
  const segments = rawPath.split("/");
  const firstParameterIndex = segments.findIndex((segment) => segment.startsWith(":"));

  // H3 mounts middleware on static prefixes. For /articles/:slug.md, mount at /articles.
  let mountPath = rawPath;
  if (firstParameterIndex !== -1) {
    mountPath = segments.slice(0, firstParameterIndex).join("/") || "/";
  }

  // H3 removes the mount path before calling match; an exact static match becomes "/".
  let remainingPath = rawPath;
  if (mountPath !== "/") remainingPath = rawPath.slice(mountPath.length) || "/";

  const patternSegments = remainingPath.split("/").map((segment) => {
    if (segment.startsWith(":")) {
      // Parameters match one segment, with a mandatory suffix on the last segment.
      if (segment.endsWith(".md")) return "[^/]+\\.md";
      return "[^/]+";
    }

    // Literal dots and other regex characters must stay literal.
    return segment.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  });
  const pathMatcher = new RegExp(`^${patternSegments.join("/")}$`, "u");

  return {
    route: mountPath,
    match: (path) => pathMatcher.test(path.split("?")[0] ?? "/"),
    handler
  };
}

/**
 * Registers one scoped middleware layer per compiled document definition.
 * @param app Existing H3 application.
 * @param definitions Application-owned document definitions.
 * @param resolveDocument Application-bound structured resolver.
 * @param options Application base URL, raw prefix and default response type.
 * @param routerHandler Native terminal router, after application middleware and route rules.
 */
export function registerMarkdownDocumentHandlers(
  app: App,
  definitions: PreparedDocumentDefinition[],
  resolveDocument: MarkdownDocumentService["resolveMarkdownDocument"],
  options: MarkdownDocumentServiceOptions = {},
  routerHandler?: EventHandler
): void {
  const rawPrefix = options.rawPrefix ?? "";
  const baseURL = parseLocalPath(options.baseURL ?? "/").path;
  const basePrefix = baseURL === "/" ? "" : baseURL;
  const contentType = `text/${options.contentType ?? "plain"}; charset=utf-8`;

  // Every document uses the same response logic; the layers below select its route.
  const handler = defineEventHandler(async (event) => {
    if (event.method !== "GET") {
      setResponseHeader(event, "Allow", "GET");
      throw createError({ statusCode: 405, statusMessage: "Method Not Allowed" });
    }

    // Use the original target because H3 strips the mounted prefix from event.path.
    const requestTarget = event.node.req.originalUrl ?? event.node.req.url ?? "/";
    const pathname = requestTarget.split("?")[0] ?? "/";
    const documentPath = pathname.slice(basePrefix.length);
    const canonicalPath = getCanonicalPath(documentPath, rawPrefix);
    const body = await renderDocument(canonicalPath, event, resolveDocument);

    setResponseHeader(event, "Content-Type", contentType);
    return body;
  });

  const orderedDefinitions = validateDocumentDefinitions(definitions);
  const layers = orderedDefinitions.map((document) => {
    const canonicalRoute = document.definition.route;
    const documentRoute = canonicalRoute === "/" ? "/index" : canonicalRoute;
    // H3 matches decoded paths; request validation still reads the original target.
    const rawPath = `${decodeURI(basePrefix)}${rawPrefix}${documentRoute}.md`;
    return createDocumentRouteLayer(rawPath, handler);
  });

  // Keep application middleware and route rules first, then documents, then the native router.
  const routerIndex = app.stack.findIndex((layer) => layer.handler === routerHandler);
  const insertionIndex = routerIndex === -1 ? app.stack.length : routerIndex;
  app.stack.splice(insertionIndex, 0, ...layers);
}
