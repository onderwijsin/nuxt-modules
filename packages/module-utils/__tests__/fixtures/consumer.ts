import assert from "node:assert/strict";
import { useLogger } from "@nuxt/kit";
import type { ModuleLogger } from "@onderwijsin/nuxt-module-utils/types";
import { z } from "zod";
import { enabled, moduleSetup, validateModuleOptions } from "@onderwijsin/nuxt-module-utils/build";

const log = useLogger("module-utils-consumer");
log satisfies ModuleLogger;
const schema = z.object({
  enabled,
  count: z.string().transform(Number),
  mode: z.enum(["development", "production"]).default("production")
});
const options = validateModuleOptions({ count: "3" }, schema, log);
options satisfies { enabled: boolean; count: number; mode: "development" | "production" };
// @ts-expect-error The parsed count must retain the transform's number output, never string or any.
const inputCount: string = options.count;
void inputCount;
assert.deepEqual(options, { enabled: true, count: 3, mode: "production" });

const setup = moduleSetup("consumer", options, log);
setup.start();
assert.equal(setup.isEnabled(), true);
setup.end();
const disabled = validateModuleOptions({ enabled: false, count: "0" }, schema, log);
assert.equal(moduleSetup("consumer", disabled, log).isEnabled(), false);
assert.throws(() => validateModuleOptions({ count: 3 }, schema, log), {
  message: "Invalid module options ☝. Exiting."
});
