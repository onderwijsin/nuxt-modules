import { isMap, parseDocument, stringify } from "yaml";
import { attemptSync } from "@onderwijsin/nuxt-module-utils/shared";
import { createError } from "h3";
import type { MarkdownDocument } from "./types";

/**
 * Checks for a leading YAML metadata block while preserving Markdown horizontal rules.
 * @param body Markdown body without frontmatter.
 * @returns Whether the body starts with a mapping enclosed in metadata delimiters.
 */
export function hasBodyFrontmatter(body: string): boolean {
  const block = /^\uFEFF?---[ \t]*\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/u.exec(body);
  if (!block) return false;
  const parsed = attemptSync(() => parseDocument(block[1] ?? "", { logLevel: "silent" }));
  return parsed.data !== null && parsed.data.errors.length === 0 && isMap(parsed.data.contents);
}

/**
 * Writes the single YAML 1.2 frontmatter block owned by HTTP delivery.
 * @param document Validated structured document.
 * @returns Markdown with metadata delimiters, or the unchanged body for empty metadata.
 */
export function serializeMarkdownDocument(document: MarkdownDocument): string {
  if (hasBodyFrontmatter(document.body)) {
    throw createError({
      statusCode: 500,
      message: "Markdown body must not contain a leading YAML frontmatter block."
    });
  }
  if (Object.keys(document.frontmatter).length === 0) return document.body;
  const result = attemptSync(() =>
    stringify(document.frontmatter, {
      version: "1.2",
      aliasDuplicateObjects: false,
      lineWidth: 0
    })
  );
  if (result.data === null)
    throw createError({ statusCode: 500, message: "Markdown frontmatter serialization failed." });
  return `---\n${result.data}---\n${document.body}`;
}
