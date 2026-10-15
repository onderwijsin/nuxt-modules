import { createError } from "h3";
import { attemptSync, isString } from "@onderwijsin/nuxt-module-utils/shared";

/** A normalized, encoded path together with its decoded route segments. */
export interface DocumentPath {
  path: string;
  segments: string[];
}

/**
 * Parses a local absolute path without letting URL parsing hide invalid traversal.
 * @param input App-relative path, optionally percent-encoded.
 * @returns Encoded canonical spelling and once-decoded segments.
 */
export function parseLocalPath(input: unknown): DocumentPath {
  if (
    !isString(input) ||
    !input.startsWith("/") ||
    input.startsWith("//") ||
    /[\\?#\p{Cc}]/u.test(input)
  ) {
    throw createError({ statusCode: 400, message: "Expected a local absolute document path." });
  }

  const path = input.replace(/\/+$/u, "") || "/";
  const decoded = attemptSync(() =>
    path === "/" ? [] : path.slice(1).split("/").map(decodeURIComponent)
  );
  if (decoded.data === null) {
    throw createError({ statusCode: 400, message: "Invalid document path encoding." });
  }

  const segments = decoded.data;
  for (const segment of segments) {
    if (
      !segment ||
      segment === "." ||
      segment === ".." ||
      /[/\\\p{Cc}]/u.test(segment) ||
      /%[0-9a-f]{2}/iu.test(segment)
    ) {
      throw createError({ statusCode: 400, message: "Invalid document path segment." });
    }
  }

  const encoded = attemptSync(() => segments.map(encodeURIComponent));
  if (encoded.data === null) {
    throw createError({ statusCode: 400, message: "Invalid document path encoding." });
  }
  return { path: `/${encoded.data.join("/")}`, segments };
}

/**
 * Applies the canonical document policy shared by resolution, listing and URL mapping.
 * @param input Canonical HTML path, excluding the application base URL.
 * @returns A normalized path with decoded parameters available for matching.
 */
export function parseDocumentPath(input: string): DocumentPath {
  const result = parseLocalPath(input);
  if (result.path === "/index" || result.path.endsWith(".md")) {
    throw createError({
      statusCode: 400,
      message: "Document paths must identify canonical HTML, not Markdown representations."
    });
  }
  return result;
}
