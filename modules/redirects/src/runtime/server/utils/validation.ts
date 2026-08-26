import type { RedirectTime, ResolvedRedirect } from "../../types/redirect";

import { z } from "zod";

import { isExternalRedirectDestination } from "../../utils/destination";
import { toRedirectOrigin } from "./path";
import { withoutTrailingSlash } from "ufo";

const redirectSchema = z.strictObject({
  from: z.string().trim().min(1),
  to: z.string().trim().min(1),
  statusCode: z
    .union([z.literal(301), z.literal(302), z.literal(307), z.literal(308)])
    .default(302),
  match: z.enum(["exact", "pattern"]).optional(),
  activeFrom: z
    .union([z.string().trim().min(1), z.number().finite()])
    .nullable()
    .optional(),
  activeUntil: z
    .union([z.string().trim().min(1), z.number().finite()])
    .nullable()
    .optional()
});

function normalizeRedirectTime(
  value: RedirectTime | undefined,
  field: string
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const timestamp = typeof value === "number" ? value : Date.parse(value);
  if (Number.isNaN(timestamp)) throw new Error(`Redirect ${field} must be a valid date.`);
  return timestamp;
}

/**
 * Checks that an explicit HTTP(S) or protocol-relative destination contains a host.
 *
 * @param destination - Untrusted explicit destination URL.
 * @returns Whether the destination has a valid HTTP(S) origin.
 */
function isHttpDestination(destination: string): boolean {
  try {
    const url = new URL(destination.startsWith("//") ? `https:${destination}` : destination);
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Checks whether a question mark in a pattern is an optional parameter marker rather than a query
 * delimiter.
 *
 * @param origin - Pattern origin to inspect.
 * @returns Whether the origin contains a query string.
 */
function hasPatternQuery(origin: string): boolean {
  for (const [index, character] of [...origin].entries()) {
    if (character !== "?") continue;
    const segmentStart = origin.lastIndexOf("/", index - 1) + 1;
    const token = origin.slice(segmentStart, index);
    const nextCharacter = origin[index + 1];
    if (
      (nextCharacter === undefined || nextCharacter === "/" || nextCharacter === ".") &&
      (/^:[^/?]+$/.test(token) || token === "*")
    )
      continue;
    return true;
  }
  return false;
}

/**
 * Validates and normalizes a redirect at the module boundary.
 *
 * @param value - Untrusted source or webhook value.
 * @returns Canonical redirect record.
 */
export function normalizeRedirect(value: unknown): ResolvedRedirect {
  const redirect = redirectSchema.parse(value);
  if (!redirect.from.startsWith("/")) throw new Error("Redirect origins must start with '/'.");
  if (redirect.match === "pattern" && hasPatternQuery(redirect.from))
    throw new Error("Pattern redirect origins must not contain query parameters.");
  if ([...redirect.to].some((character) => character <= "\u001F" || character === "\u007F"))
    throw new Error("Redirect destinations must not contain control characters.");
  if (redirect.to.startsWith("//") || /^https?:\/\//i.test(redirect.to)) {
    if (!isHttpDestination(redirect.to))
      throw new Error("Redirect destinations must contain an HTTP(S) host.");
  } else if (!redirect.to.startsWith("/") && !isExternalRedirectDestination(redirect.to)) {
    throw new Error("Redirect destinations must be internal paths or HTTP(S) URLs.");
  }

  const activeFrom = normalizeRedirectTime(redirect.activeFrom, "activeFrom");
  const activeUntil = normalizeRedirectTime(redirect.activeUntil, "activeUntil");
  return {
    ...redirect,
    from:
      redirect.match === "pattern"
        ? withoutTrailingSlash(redirect.from)
        : toRedirectOrigin(redirect.from),
    ...(activeFrom === undefined ? {} : { activeFrom }),
    ...(activeUntil === undefined ? {} : { activeUntil })
  };
}
