import { describe, expect, it, vi } from "vitest";
import { isPrepareMode, moduleSetup, resolveLoggerScope, resolveModuleName } from "../src/index";

describe("module naming helpers", () => {
  it("resolves a config key to the repository module name", () => {
    expect(resolveModuleName("uiFormExtenions")).toBe("@onderwijsin/nuxt-ui-form-extenions");
  });

  it("resolves a config key to a logger scope", () => {
    expect(resolveLoggerScope("uiFormExtenions")).toBe("ui-form-extenions");
  });
});

describe("isPrepareMode", () => {
  it("returns whether Nuxt is preparing the project", () => {
    expect(isPrepareMode({ options: { _prepare: true } } as never)).toBe(true);
    expect(isPrepareMode({ options: { _prepare: false } } as never)).toBe(false);
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
    const log = { start: vi.fn(), success: vi.fn(), info: vi.fn() };
    const setup = moduleSetup("@onderwijsin/nuxt-example", { enabled: false }, log as never);

    expect(setup.isEnabled()).toBe(false);
    expect(log.info).toHaveBeenCalledWith(
      "Module @onderwijsin/nuxt-example is disabled. Skipping setup..."
    );
  });
});
