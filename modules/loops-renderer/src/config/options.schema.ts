import { z } from "zod";
import { enabled } from "@onderwijsin/nuxt-module-utils/build";

export const loopsRendererOptionsSchema = z.strictObject({
  enabled,
  applyInlineStyles: z.boolean().default(true),
  evaluate: z
    .strictObject({
      /** Result for a valid variable whose value is null or undefined. */
      onMissingVariable: z.boolean().default(false),
      /** Result for malformed rules, unsupported variables, or unknown operations. */
      onInvalidCondition: z.boolean().default(false),
      /** Result when an operation cannot compare the resolved value. */
      onInvalidComparison: z.boolean().default(false)
    })
    .default({
      onMissingVariable: false,
      onInvalidCondition: false,
      onInvalidComparison: false
    })
});

export type ModuleOptions = z.input<typeof loopsRendererOptionsSchema>;
export type ResolvedModuleOptions = z.output<typeof loopsRendererOptionsSchema>;
