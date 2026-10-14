import { z } from "zod";
import { createError } from "h3";
import { attempt, attemptSync, isDefined } from "@onderwijsin/nuxt-module-utils/shared";
import type {
  MarkdownDocument,
  MarkdownDocumentContext,
  MarkdownDocumentDefinition,
  MarkdownDocumentFetchContext,
  MarkdownDocumentListItem
} from "./types";

const documentSchema = z.strictObject({
  frontmatter: z.record(z.string(), z.unknown()),
  body: z.string()
});

/** A definition with typed callbacks bound before heterogeneous definitions are collected. */
export interface PreparedDocumentDefinition {
  source: string;
  definition: { route: string; prerender?: boolean };
  resolve: (context: MarkdownDocumentFetchContext) => Promise<MarkdownDocument | null>;
  list: (context?: MarkdownDocumentContext) => Promise<MarkdownDocumentListItem[]>;
}

/**
 * Executes a consumer callback without exposing its errors or source payloads.
 * @param source Definition filename for diagnostics.
 * @param operation Callback operation name.
 * @param callback Consumer callback to execute.
 * @returns The callback result, including a successful null fetch.
 */
async function runCallback<T>(
  source: string,
  operation: string,
  callback: () => T | Promise<T>
): Promise<T> {
  const result = await attempt(async () => ({ value: await callback() }));
  if (result.data === null) {
    throw createError({
      statusCode: 500,
      message: `Markdown document ${operation} failed in ${source}.`
    });
  }
  return result.data.value;
}

/**
 * Binds each fetch result to its matching transform without casts or callback execution.
 * @param definition Consumer-authored typed definition.
 * @param source Definition filename for diagnostics.
 * @returns A uniform server-only definition for the application service.
 */
export function prepareDocumentDefinition<T>(
  definition: MarkdownDocumentDefinition<T>,
  source: string
): PreparedDocumentDefinition {
  return {
    source,
    definition,
    async resolve(context) {
      const data = await runCallback(source, "fetch", () => definition.fetch(context));
      if (data === null) return null;
      if (!isDefined(data)) {
        throw createError({
          statusCode: 500,
          message: `Markdown document fetch must return a source or null in ${source}.`
        });
      }
      const transformed = await runCallback(source, "transform", () => definition.transform(data));
      const parsed = attemptSync(() => documentSchema.safeParse(transformed));
      if (parsed.data === null || !parsed.data.success) {
        throw createError({
          statusCode: 500,
          message: `Invalid Markdown document transform in ${source}. Expected frontmatter and a string body.`
        });
      }
      return parsed.data.data;
    },
    async list(context) {
      const list = definition.list;
      if (!list) return [];
      return runCallback(source, "list", () => list.call(definition, context));
    }
  };
}
