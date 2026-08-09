import { describe, expect, it } from "vitest";
import { $fetch } from "@nuxt/test-utils/e2e";
import { setupFixture } from "../../../packages/test-utils/src";

describe("healthcheck module", async () => {
  await setupFixture(import.meta.url);

  it("returns pong from the public ping endpoint", async () => {
    await expect($fetch<string>("/api/system/ping")).resolves.toBe("pong");
  });

  it("returns valid health JSON including a delayed custom component", async () => {
    const response = await $fetch<{
      data: {
        status: string;
        timestamp: string;
        components: Record<string, { status: string; responseTimeMs: number }>;
      };
    }>("/api/system/health");

    expect(response.data.status).toBe("ok");
    expect(Number.isNaN(Date.parse(response.data.timestamp))).toBe(false);
    const delayed = response.data.components.delayed;
    expect(delayed).toBeDefined();
    if (!delayed) return;
    expect(delayed.status).toBe("ok");
    expect(delayed.responseTimeMs).toBeGreaterThanOrEqual(20);
  });
});
