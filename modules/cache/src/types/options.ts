import type { z } from "zod";
import type { cacheOptionsSchema } from "../config/options.schema";

/** Public configuration accepted by the cache module. */
export type ModuleOptions = z.input<typeof cacheOptionsSchema>;

/** Fully validated cache module configuration. */
export type ResolvedModuleOptions = z.output<typeof cacheOptionsSchema>;
