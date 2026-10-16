import type { z } from "zod";
import type { markdownDocumentsOptionsSchema } from "../config/options.schema";

/** Configuration for server-owned Markdown document definitions. */
export type ModuleOptions = z.input<typeof markdownDocumentsOptionsSchema>;
