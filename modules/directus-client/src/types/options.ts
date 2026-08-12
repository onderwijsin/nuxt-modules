import type { z } from "zod";

import type { directusClientOptionsSchema } from "../config/options.schema";

export type ModuleOptions = z.input<typeof directusClientOptionsSchema>;
export type ResolvedModuleOptions = z.output<typeof directusClientOptionsSchema>;
