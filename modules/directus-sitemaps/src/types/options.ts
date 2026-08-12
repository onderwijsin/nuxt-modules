import type { z } from "zod";

import type { directusSitemapsOptionsSchema } from "../config/options.schema";

/** Public directus-sitemaps module configuration. */
export type ModuleOptions = z.input<typeof directusSitemapsOptionsSchema>;

/** Validated directus-sitemaps module configuration. */
export type ResolvedModuleOptions = z.output<typeof directusSitemapsOptionsSchema>;
