import { z } from "zod";
import { enabled } from "@onderwijsin/nuxt-module-utils/shared";

const relativeContentPathError =
  "content must be a relative path such as assets/ui/content or ./assets/ui/content";
const validPathSegment = /^[A-Za-z0-9._-]+$/;

function isRelativeContentPath(value: string): boolean {
  const path = value.startsWith("./") ? value.slice(2) : value;
  const segments = path.split("/");

  return segments.every(
    (segment) => validPathSegment.test(segment) && segment !== "." && segment !== ".."
  );
}

/** Runtime validation for the text module options. */
export const staticTextOptionsSchema = z.object({
  enabled,
  content: z.string().refine(isRelativeContentPath, { error: relativeContentPathError }).optional()
});
