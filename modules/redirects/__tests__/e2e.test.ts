import { beforeEach, describe, expect, it } from "vitest";
import { $fetch, url } from "@nuxt/test-utils/e2e";
import { setupFixture } from "../../../packages/test-utils/src";

describe("redirects module", async () => {
  await setupFixture(import.meta.url);

  beforeEach(async () => {
    await $fetch("/api/_test/refresh", { method: "POST" });
  });

  it("refreshes consumer sources into the list and lookup endpoints", async () => {
    await expect($fetch("/api/_redirects")).resolves.toEqual({
      data: {
        "/client-origin": {
          from: "/client-origin",
          to: "docs.example.com/redirects?source=client",
          statusCode: 302
        },
        "/server-origin": {
          from: "/server-origin",
          to: "/server-destination?from=redirect",
          statusCode: 301
        },
        "/search?q=old": {
          from: "/search?q=old",
          to: "/search-archive?source=redirect",
          statusCode: 308
        }
      }
    });
    await expect($fetch("/api/_redirects/%2Fsearch%3Fq%3Dold")).resolves.toEqual({
      data: {
        from: "/search?q=old",
        to: "/search-archive?source=redirect",
        statusCode: 308
      }
    });
    await expect($fetch("/api/_redirects/%2Fsearch%3Fq%3Dnew")).resolves.toEqual({ data: null });
  });

  it("redirects matching server requests without intercepting excluded API routes", async () => {
    const redirected = await fetch(url("/server-origin"), { redirect: "manual" });

    expect(redirected.status).toBe(301);
    expect(redirected.headers.get("location")).toBe("/server-destination?from=redirect");
    await expect($fetch("/api/_test/refresh", { method: "POST" })).resolves.toMatchObject({
      data: expect.any(Object)
    });
  });
});
