import type { MarkdownDocumentDefinition } from "./types";

export type {
  MarkdownDocument,
  MarkdownDocumentContext,
  MarkdownDocumentDefinition,
  MarkdownDocumentFetchContext,
  MarkdownDocumentListItem,
  MarkdownDocumentService
} from "./types";

/**
 * Defines a server-owned document while inferring the fetched source for transform.
 * @param definition Consumer fetch, transformation and optional listing callbacks.
 * @returns The unchanged definition; no callbacks execute during definition.
 */
export function defineMarkdownDocument<TSource>(
  definition: MarkdownDocumentDefinition<TSource>
): MarkdownDocumentDefinition<TSource> {
  return definition;
}
