import { describe, expect, it, vi } from "vitest";

const defineEventHandler = vi.fn((handler) => handler);

vi.mock("h3", () => ({ defineEventHandler }));
vi.mock("@onderwijsin/nuxt-simple-rate-limiter/runtime", () => ({ enforceRateLimit: vi.fn() }));

describe("Sentry diagnostic error route", () => {
  it("defines the controlled error handler", async () => {
    await import("../src/runtime/server/api/trigger-error.get");

    expect(defineEventHandler).toHaveBeenCalledOnce();
  });
});
