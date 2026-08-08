import { beforeEach, describe, expect, it, vi } from "vitest";

const addServerImports = vi.fn();

vi.mock("@nuxt/kit", () => ({
  addServerImports,
  createResolver: () => ({ resolve: (...segments: string[]) => segments.join("/") }),
  defineNuxtModule: <T>(definition: T) => definition
}));

describe("simple rate limiter module", () => {
  beforeEach(() => {
    vi.resetModules();
    addServerImports.mockReset();
  });

  it("auto-imports both rate limit helpers in Nitro server handlers", async () => {
    const module = (await import("../src/module")).default;
    const setup = Reflect.get(module, "setup");

    await Reflect.apply(setup, module, [{}]);

    expect(addServerImports).toHaveBeenCalledWith({
      name: "enforceRateLimit",
      from: "./runtime"
    });
    expect(addServerImports).toHaveBeenCalledWith({
      name: "enforceGlobalRateLimit",
      from: "./runtime"
    });
  });
});
