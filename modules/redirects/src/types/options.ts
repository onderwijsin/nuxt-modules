import type { z } from "zod";

import type { redirectsOptionsSchema } from "../config/options.schema";

/** Public redirects module configuration. */
export type ModuleOptions = z.input<typeof redirectsOptionsSchema>;

/** Fully validated redirects module configuration. */
export type ResolvedModuleOptions = z.output<typeof redirectsOptionsSchema>;
