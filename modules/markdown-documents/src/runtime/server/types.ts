import type { H3Event } from "h3";

type MaybePromise<T> = T | Promise<T>;

/** Structured metadata and consumer-produced Markdown, before YAML serialization. */
export interface MarkdownDocument {
  frontmatter: Record<string, unknown>;
  body: string;
}

/** Public discovery metadata; path identifies canonical HTML, not a Markdown URL. */
export interface MarkdownDocumentListItem {
  title: string;
  path: string;
  description?: string;
}

/** Context shared by request-time and event-free build-time operations. */
export interface MarkdownDocumentContext {
  event?: H3Event;
}

/** Route parameters supplied to a document fetch operation. */
export interface MarkdownDocumentFetchContext extends MarkdownDocumentContext {
  params: Record<string, string>;
}

/** Consumer-owned server definition with fetch-to-transform type inference. */
export interface MarkdownDocumentDefinition<TSource> {
  route: string;
  fetch: (context: MarkdownDocumentFetchContext) => MaybePromise<TSource | null>;
  transform: (source: NoInfer<NonNullable<TSource>>) => MaybePromise<MarkdownDocument>;
  list?: (context?: MarkdownDocumentContext) => MaybePromise<MarkdownDocumentListItem[]>;
  /** Reserved compatibility setting; does not schedule prerendering. */
  prerender?: boolean;
}

/** Application-specific URL and delivery configuration used by the generated server service. */
export interface MarkdownDocumentServiceOptions {
  baseURL?: string;
  rawPrefix?: string | null;
  /** Default HTTP response type when the request has no supported preference. */
  contentType?: "plain" | "markdown";
  /** Reserved compatibility setting; does not schedule prerendering. */
  prerender?: boolean;
}

/** Server-only utilities bound to the application's discovered definitions. */
export interface MarkdownDocumentService {
  resolveMarkdownDocument: (
    path: string,
    context?: MarkdownDocumentContext
  ) => Promise<MarkdownDocument | null>;
  listMarkdownDocuments: (context?: MarkdownDocumentContext) => Promise<MarkdownDocumentListItem[]>;
  getMarkdownDocumentURL: (path: string) => string;
}
