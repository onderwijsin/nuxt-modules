import { describe, expect, it, vi } from "vitest";

import { createTestEvent } from "../../../packages/test-utils/src";

const runtimeConfig = { directusClient: { baseUrl: "https://directus.example.test/" } };

vi.mock("#imports", () => ({
  useRuntimeConfig: () => {
    throw new Error("Nuxt context is unavailable");
  }
}));

const { getDirectusRuntimeConfig } = await import("../src/runtime/core/runtime-config");

describe("getDirectusRuntimeConfig", () => {
  it("reads configuration from the H3 event without Nuxt context", () => {
    const event = createTestEvent();
    event.context.nitro = { runtimeConfig };

    expect(getDirectusRuntimeConfig(event)).toBe(runtimeConfig);
  });
});
