import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  isPrepareMode,
  moduleSetup,
  resolveLoggerScope,
  resolveModuleName,
  validateModuleOptions
} from "../src/shared/index";
import { hasMatchingRequestToken, isAdmin } from "../src/server/index";

vi.mock("h3", () => ({
  getRequestHeader: (
    event: { node?: { req?: { headers?: Record<string, string> } } },
    name: string
  ) => event.node?.req?.headers?.[name.toLowerCase()]
}));

describe("module naming helpers", () => {
  it("resolves a config key to the repository module name", () => {
    expect(resolveModuleName("uiFormExtensions")).toBe("@onderwijsin/nuxt-ui-form-extensions");
  });

  it("resolves a config key to a logger scope", () => {
    expect(resolveLoggerScope("uiFormExtensions")).toBe("ui-form-extensions");
  });
});

describe("isPrepareMode", () => {
  it("returns whether Nuxt is preparing the project", () => {
    expect(isPrepareMode({ options: { _prepare: true } } as never)).toBe(true);
    expect(isPrepareMode({ options: { _prepare: false } } as never)).toBe(false);
  });
});

describe("request token helpers", () => {
  const event = (headers: Record<string, string>) => ({ node: { req: { headers } } }) as never;

  it("matches a configured header token", () => {
    expect(
      hasMatchingRequestToken(event({ "x-admin-token": "secret" }), "secret", "x-admin-token")
    ).toBe(true);
  });

  it("matches bearer tokens and rejects other schemes or tokens", () => {
    expect(
      hasMatchingRequestToken(event({ authorization: "Bearer secret" }), "secret", "x-admin-token")
    ).toBe(true);
    expect(
      hasMatchingRequestToken(event({ authorization: "Basic secret" }), "secret", "x-admin-token")
    ).toBe(false);
    expect(isAdmin(event({ authorization: "Bearer wrong" }), "secret", "x-admin-token")).toBe(
      false
    );
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

describe("validateModuleOptions", () => {
  it("defaults enabled and preserves the schema output types", () => {
    const log = { info: vi.fn() };
    const result = validateModuleOptions(
      { name: "example" },
      { name: z.string(), retries: z.number().default(2) },
      log as never
    );

    expect(result).toEqual({ enabled: true, name: "example", retries: 2 });
    expect(result.enabled).toBe(true);
    expect(result.name).toBe("example");
    expect(result.retries).toBe(2);
  });

  it("validates the merged schema and logs invalid options", () => {
    const log = { info: vi.fn() };

    expect(() => validateModuleOptions({ name: 42 }, { name: z.string() }, log as never)).toThrow(
      "Invalid module options ☝. Exiting."
    );
    expect(log.info).toHaveBeenCalled();
  });

  it("keeps an explicit enabled value", () => {
    const log = { info: vi.fn() };

    const result = validateModuleOptions(
      { enabled: false, mode: "production" },
      { mode: z.enum(["development", "production"]) },
      log as never
    );

    expect(result).toEqual({ enabled: false, mode: "production" });
  });
});
