import { enabled } from "@onderwijsin/nuxt-module-utils/build";
import { z } from "zod";

/** Runtime validation schema for the public Markdown renderer module options. */
export const markdownRendererOptionsSchema = z.strictObject({
  enabled: enabled.default(true)
});

export type ModuleOptions = z.input<typeof markdownRendererOptionsSchema>;
export type ResolvedModuleOptions = z.output<typeof markdownRendererOptionsSchema>;
