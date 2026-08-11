import type { z } from "zod";

import type { directusOptionsSchema } from "../config/options.schema";

export type ModuleOptions = z.input<typeof directusOptionsSchema>;
export type ResolvedModuleOptions = z.output<typeof directusOptionsSchema>;
