import { z } from "zod";

export default {
  applyInlineStyles: z.boolean().default(true),
  evaluate: z.object({
    /** Result for a valid variable whose value is null or undefined. */
    onMissingVariable: z.boolean().default(false),
    /** Result for malformed rules, unsupported variables, or unknown operations. */
    onInvalidCondition: z.boolean().default(false),
    /** Result when an operation cannot compare the resolved value. */
    onInvalidComparison: z.boolean().default(false)
  })
};
