import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { $fetch, setupFixture, useTestContext } from "../../../packages/test-utils/src";

describe("redirect sources in development", async () => {
  await setupFixture(import.meta.url, "basic", { dev: true });

  it("keeps the source registry virtual instead of writing a raw server entrypoint", () => {
    const nuxt = useTestContext().nuxt;
    if (!nuxt) throw new Error("Nuxt test context is unavailable");
    expect(existsSync(join(nuxt.options.buildDir, "redirects-source-registry.mjs"))).toBe(false);
  });

  it("refreshes registered sources through the consumer task", async () => {
    await expect($fetch("/api/_test/task", { method: "POST" })).resolves.toMatchObject({
      result: { count: 8 }
    });
  });

  it("resolves virtual runtime imports through the generated source registry", async () => {
    await $fetch("/api/_test/refresh", { method: "POST" });
    await expect($fetch("/api/_redirects/%2Fserver-origin")).resolves.toMatchObject({
      data: { to: "/server-destination?from=redirect", statusCode: 301 }
    });
  });
});
