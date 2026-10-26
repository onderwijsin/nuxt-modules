import { beforeEach, describe, expect, it, vi } from "vitest";

const kit = vi.hoisted(() => ({
  addComponent: vi.fn(),
  createResolver: () => ({ resolve: (...parts: string[]) => parts.join("/") }),
  defineNuxtModule: (definition: unknown) => definition
}));
vi.mock("@nuxt/kit", () => kit);

import breakpointModule from "../src/module";

describe("tailwind breakpoint module", () => {
  beforeEach(() => vi.clearAllMocks());

  it("declares Nuxt 4 compatibility and the Nuxt UI module dependency", () => {
    expect(breakpointModule).toMatchObject({
      meta: {
        name: "@onderwijsin/nuxt-tailwind-breakpoint",
        configKey: "tailwindBreakpoint",
        compatibility: { nuxt: "^4.0.0" }
      },
      moduleDependencies: { "@nuxt/ui": { version: "^4.0.0" } }
    });
  });

  it("registers exactly one client-only component and transpiles its runtime", () => {
    const setup = Reflect.get(breakpointModule, "setup");
    if (typeof setup !== "function") throw new Error("Module setup is unavailable");
    const nuxt = { options: { build: { transpile: [] } } };
    setup({}, nuxt);
    expect(kit.addComponent).toHaveBeenCalledExactlyOnceWith({
      name: "TailwindBreakpoint",
      filePath: "./runtime/app/components/TailwindBreakpoint.client.vue",
      mode: "client"
    });
    expect(nuxt.options.build.transpile).toEqual(["./runtime"]);
  });
});
