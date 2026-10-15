import { z } from "zod";
import { enabled } from "@onderwijsin/nuxt-module-utils/build";

const directory = z
  .string()
  .min(1)
  .refine(
    (value) =>
      value.trim() === value &&
      !value.startsWith("/") &&
      !/[\\:\p{Cc}?#]/u.test(value) &&
      value.split("/").every((segment) => segment !== "" && segment !== "." && segment !== ".."),
    { error: "Use a non-empty directory relative to rootDir, without traversal." }
  );

const prefix = z.string().regex(/^\/(?:[A-Za-z0-9_-]+)(?:\/[A-Za-z0-9_-]+)*$/u, {
  error: "Use a local prefix such as /raw, or null for no prefix."
});

/** Validates module options, leaving the delivery prefix unset by default. */
export const markdownDocumentsOptionsSchema = z.strictObject({
  enabled,
  dir: directory.default("server/documents"),
  rawPrefix: prefix.nullable().optional(),
  contentType: z.enum(["plain", "markdown"]).default("plain"),
  prerender: z.boolean().default(false)
});
