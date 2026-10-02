import { enabled } from "@onderwijsin/nuxt-module-utils/build";
import { z } from "zod";

const origin = z.string().trim().min(1);

/** Runtime validation schema for the public Markdown renderer module options. */
export const markdownRendererOptionsSchema = z.strictObject({
  enabled: enabled.default(true),
  componentsDir: z.string().trim().min(1).default("renderer"),
  componentSets: z.record(z.string(), z.array(z.string().trim().min(1))).default({}),
  resolveReferencePath: z.string().trim().min(1).optional(),
  videoBaseUrl: z.url().optional(),
  corsOrigin: z
    .union([
      z.literal("*"),
      z.literal("null"),
      z.array(origin).min(1),
      origin.transform((value) => [value])
    ])
    .default("*")
});

export type ModuleOptions = z.input<typeof markdownRendererOptionsSchema>;
export type ResolvedModuleOptions = z.output<typeof markdownRendererOptionsSchema>;
