import { beforeEach, describe, expect, it, vi } from "vitest";

const addServerImports = vi.fn();
const addTemplate = vi.fn();

vi.mock("@nuxt/kit", () => ({
  addServerImports,
  addTemplate,
  createResolver: () => ({ resolve: (...segments: string[]) => segments.join("/") }),
  defineNuxtModule: <T>(definition: T) => definition
}));

describe("simple rate limiter module", () => {
  beforeEach(() => {
    vi.resetModules();
    addServerImports.mockReset();
    addTemplate.mockReset();
    addTemplate.mockReturnValue({ dst: ".nuxt/tasks/simple-rate-limiter-prune.mjs" });
  });

  it("auto-imports both rate limit helpers in Nitro server handlers", async () => {
    const module = (await import("../src/module")).default;
    const setup = Reflect.get(module, "setup");

    await Reflect.apply(setup, module, [{}, { options: { runtimeConfig: {} }, hook: vi.fn() }]);

    expect(addServerImports).toHaveBeenCalledWith({
      name: "enforceRateLimit",
      from: "./runtime"
    });
    expect(addServerImports).toHaveBeenCalledWith({
      name: "enforceGlobalRateLimit",
      from: "./runtime"
    });
    expect(addTemplate).not.toHaveBeenCalled();
  });

  it("registers optional global pruning with its configured schedule", async () => {
    const module = (await import("../src/module")).default;
    const hook = vi.fn();
    const nuxt = { options: { runtimeConfig: {} }, hook };
    const setup = Reflect.get(module, "setup");

    await Reflect.apply(setup, module, [
      { global: { enabled: true, pruning: { enabled: true, cron: "*/15 * * * *" } } },
      nuxt
    ]);

    expect(addTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ filename: "tasks/simple-rate-limiter-prune.mjs", write: true })
    );
    const taskTemplate = addTemplate.mock.calls[0]?.[0];
    expect(taskTemplate.getContents()).toBe(
      'export { default } from "./runtime/tasks/prune.js";\n'
    );
    expect(hook).toHaveBeenCalledWith("nitro:config", expect.any(Function));
    const configureNitro = hook.mock.calls[0]?.[1];
    const nitroConfig = {
      experimental: { tasks: false },
      tasks: {},
      scheduledTasks: {}
    };
    configureNitro(nitroConfig);

    expect(nitroConfig).toEqual({
      experimental: { tasks: true },
      tasks: {
        "simple-rate-limiter:prune": {
          handler: ".nuxt/tasks/simple-rate-limiter-prune.mjs",
          description: "Remove stale global simple rate limiter records."
        }
      },
      scheduledTasks: { "*/15 * * * *": ["simple-rate-limiter:prune"] }
    });
  });
});
