import type { z } from "zod";
import type { storageAdminOptionsSchema } from "../config/options.schema";

/** Public configuration accepted by the storage-admin module. */
export type ModuleOptions = z.input<typeof storageAdminOptionsSchema>;

/** Fully validated storage-admin configuration. */
export type ResolvedModuleOptions = z.output<typeof storageAdminOptionsSchema>;
