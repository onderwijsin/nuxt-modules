import { enabled } from "@onderwijsin/nuxt-module-utils/build";
import { z } from "zod";

/** Runtime validation schema for the UI form extensions module options. */
export const uiFormExtensionsOptionsSchema = z.strictObject({ enabled });

export type ModuleOptions = z.input<typeof uiFormExtensionsOptionsSchema>;
export type ResolvedModuleOptions = z.output<typeof uiFormExtensionsOptionsSchema>;
