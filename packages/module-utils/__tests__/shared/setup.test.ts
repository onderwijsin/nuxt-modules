import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  enabled,
  moduleDependenciesWhenEnabled,
  isPrepareMode,
  moduleSetup,
  resolveLoggerScope,
  resolveModuleName,
  transpileRuntime,
  validateModuleOptions
} from "../../src/shared/setup";

describe("module naming helpers", () => {
  it("resolves a config key to the repository module name", () => {
    expect(resolveModuleName("uiFormExtensions")).toBe("@onderwijsin/nuxt-ui-form-extensions");
  });

  it("resolves a config key to a logger scope", () => {
    expect(resolveLoggerScope("uiFormExtensions")).toBe("ui-form-extensions");
  });
});

describe("shared option schemas", () => {
  it("defaults the shared enabled option to true", () => {
    expect(enabled.parse(undefined)).toBe(true);
    expect(enabled.parse(false)).toBe(false);
  });
});

describe("moduleDependenciesWhenEnabled", () => {
  const dependencies = { "@nuxt/ui": { version: ">=4.0.0" } };

  it.each([undefined, {}, { enabled: true }])("returns dependencies for %o", (options) => {
    expect(moduleDependenciesWhenEnabled(options, dependencies)).toBe(dependencies);
  });

  it.each([{ enabled: false }, false])("returns an empty map for %o", (options) => {
    expect(moduleDependenciesWhenEnabled(options, dependencies)).toEqual({});
  });
});

describe("isPrepareMode", () => {
  it("returns whether Nuxt is preparing the project", () => {
    expect(isPrepareMode({ options: { _prepare: true } } as never)).toBe(true);
    expect(isPrepareMode({ options: { _prepare: false } } as never)).toBe(false);
  });
});

describe("transpileRuntime", () => {
  it("adds the runtime directory to Nuxt transpilation", () => {
    const nuxt = { options: { build: { transpile: [] } } } as never;

    transpileRuntime(nuxt, "/module/runtime");

    expect(nuxt.options.build.transpile).toEqual(["/module/runtime"]);
  });
});

describe("moduleSetup", () => {
  it("logs setup lifecycle events and allows enabled modules", () => {
    const log = { start: vi.fn(), success: vi.fn(), info: vi.fn() };
    const setup = moduleSetup("@onderwijsin/nuxt-example", {}, log as never);

    setup.start();
    setup.end();

    expect(setup.isEnabled()).toBe(true);
    expect(log.start).toHaveBeenCalledWith("Loading module @onderwijsin/nuxt-example");
    expect(log.success).toHaveBeenCalledWith("Module @onderwijsin/nuxt-example Loaded");
    expect(log.info).not.toHaveBeenCalled();
  });

  it("skips disabled modules and logs the reason", () => {
    const log = { info: vi.fn() };
    const setup = moduleSetup("@onderwijsin/nuxt-example", { enabled: false }, log as never);

    expect(setup.isEnabled()).toBe(false);
    expect(log.info).toHaveBeenCalledWith(
      "Module @onderwijsin/nuxt-example is disabled. Skipping setup..."
    );
  });
});

describe("validateModuleOptions", () => {
  it("returns parsed defaults and preserves the schema output", () => {
    const log = { info: vi.fn() };
    const result = validateModuleOptions(
      { name: "example" },
      z.object({
        enabled: z.boolean().default(true),
        name: z.string(),
        retries: z.number().default(2)
      }),
      log as never
    );

    expect(result).toEqual({ enabled: true, name: "example", retries: 2 });
  });

  it("logs and throws when options are invalid", () => {
    const log = { info: vi.fn() };

    expect(() =>
      validateModuleOptions(
        { enabled: true, name: 42 },
        z.object({ enabled: z.boolean(), name: z.string() }),
        log as never
      )
    ).toThrow("Invalid module options ☝. Exiting.");
    expect(log.info).toHaveBeenCalled();
  });

  it("keeps explicit option values", () => {
    const log = { info: vi.fn() };

    const result = validateModuleOptions(
      { enabled: false, mode: "production" },
      z.object({ enabled: z.boolean(), mode: z.enum(["development", "production"]) }),
      log as never
    );

    expect(result).toEqual({ enabled: false, mode: "production" });
  });
});
