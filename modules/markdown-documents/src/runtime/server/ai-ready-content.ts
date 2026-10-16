import type { H3Event } from "h3";
import { isString } from "@onderwijsin/nuxt-module-utils/shared";
import { parseLocalPath } from "./paths";
import { serializeMarkdownDocument } from "./serialize";
import type { MarkdownDocumentService, MarkdownDocumentServiceOptions } from "./types";

/** Source metadata understood by nuxt-ai-ready 2.5.3. Arbitrary fields belong in markdown. */
interface MarkdownSource {
  markdown: string;
  title?: string;
  description?: string;
  updatedAt?: string;
}

/** Runtime source hook context supplied before AI Ready fetches HTML. */
export interface MarkdownSourceContext {
  route: string;
  event: H3Event;
  source: MarkdownSource | null;
}

/** Conversion hook context shared by runtime, prerendering and indexing. */
export interface PageMarkdownContext {
  route: string;
  event?: H3Event;
  markdown: string;
}

/** Local structural contract for the optional source hook. */
interface SourceHooks {
  hook(
    name: "ai-ready:markdown:source",
    callback: (context: MarkdownSourceContext) => Promise<void>
  ): unknown;
}

/** Local structural contract for the optional conversion hook. */
interface MarkdownHooks {
  hook(
    name: "ai-ready:page:markdown",
    callback: (context: PageMarkdownContext) => Promise<void>
  ): unknown;
}

/**
 * Removes deployment prefixes from an AI Ready runtime Markdown source route.
 * @param route Route supplied by AI Ready, without a .md suffix.
 * @param options Application base URL and raw document prefix.
 * @returns Canonical document path for structured resolution.
 */
function sourceDocumentPath(route: string, options: MarkdownDocumentServiceOptions): string {
  let path = parseLocalPath(route).path;
  for (const prefix of [options.baseURL, options.rawPrefix]) {
    if (!prefix) continue;
    const normalized = parseLocalPath(prefix).path;
    if (normalized === "/") continue;
    if (path === normalized) path = "/";
    else if (path.startsWith(`${normalized}/`)) path = path.slice(normalized.length);
  }
  return path;
}

/**
 * Supplies original documents before AI Ready performs its runtime HTML conversion.
 * @param hooks Nitro runtime hooks.
 * @param service Application-bound structured document resolver.
 * @param options Deployment prefixes used by raw document delivery.
 */
export function registerMarkdownDocumentAiReadySource(
  hooks: SourceHooks,
  service: MarkdownDocumentService,
  options: MarkdownDocumentServiceOptions = {}
): void {
  hooks.hook("ai-ready:markdown:source", async (context) => {
    const path = sourceDocumentPath(context.route, options);
    const document = await service.resolveMarkdownDocument(path, { event: context.event });
    if (!document) return;

    const { title, description, updatedAt } = document.frontmatter;
    context.source = {
      markdown: serializeMarkdownDocument(document),
      ...(isString(title) ? { title } : {}),
      ...(isString(description) ? { description } : {}),
      ...(isString(updatedAt) ? { updatedAt } : {})
    };
  });
}

/**
 * Replaces converted Markdown when AI Ready processes a known document for indexing or prerendering.
 * @param hooks Nitro runtime hooks.
 * @param service Application-bound structured document resolver.
 */
export function registerMarkdownDocumentAiReadyMarkdown(
  hooks: MarkdownHooks,
  service: MarkdownDocumentService
): void {
  hooks.hook("ai-ready:page:markdown", async (context) => {
    const document = await service.resolveMarkdownDocument(context.route, { event: context.event });
    if (document) context.markdown = serializeMarkdownDocument(document);
  });
}
