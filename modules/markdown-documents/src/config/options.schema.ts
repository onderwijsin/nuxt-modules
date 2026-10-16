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
  /** Enable definition discovery and server registration. @default true */
  enabled,
  /** Definition directory relative to rootDir; layers are not merged. @default "server/documents" */
  dir: directory.default("server/documents"),
  /** Raw Markdown delivery prefix; omit or use null for /:path.md. @default undefined */
  rawPrefix: prefix.nullable().optional(),
  /** Response MIME type; request headers do not override it. @default "plain" */
  contentType: z.enum(["plain", "markdown"]).default("plain")
});
