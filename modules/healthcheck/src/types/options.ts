import type { z } from "zod";

import type { healthcheckOptionsSchema } from "../config/options.schema";

export type ModuleOptions = z.input<typeof healthcheckOptionsSchema>;
export type ResolvedModuleOptions = z.output<typeof healthcheckOptionsSchema>;
