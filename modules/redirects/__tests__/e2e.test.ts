import { beforeEach, describe, expect, it } from "vitest";
import { $fetch, setupFixture, url } from "../../../packages/test-utils/src";

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
        },
        "/foo-bar": { from: "/foo-bar", to: "/hyphenated", statusCode: 302 },
        "/foobar": { from: "/foobar", to: "/plain", statusCode: 302 },
        "/refresh-origin": {
          from: "/refresh-origin",
          to: "/refresh-first",
          statusCode: 302
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

  it("invalidates cached public responses and primes the lookup after a webhook upsert", async () => {
    const initial = await $fetch<{ data: Record<string, unknown> }>("/api/_redirects");
    expect(initial.data["/webhook-origin?campaign=spring"]).toBeUndefined();

    await expect($fetch("/api/_test/upsert", { method: "POST" })).resolves.toMatchObject({
      data: { from: "/webhook-origin?campaign=spring", statusCode: 308 }
    });
    await expect(
      $fetch<{ data: Record<string, unknown> }>("/api/_redirects")
    ).resolves.toMatchObject({
      data: {
        "/webhook-origin?campaign=spring": {
          to: "/webhook-destination",
          statusCode: 308
        }
      }
    });
    await expect(
      $fetch("/api/_redirects/%2Fwebhook-origin%3Fcampaign%3Dspring")
    ).resolves.toMatchObject({
      data: { to: "/webhook-destination", statusCode: 308 }
    });
  });

  it("keeps distinct paths separate when their encoded lookup keys would otherwise collide", async () => {
    await expect($fetch("/api/_redirects/%2Ffoo-bar")).resolves.toMatchObject({
      data: { to: "/hyphenated" }
    });
    await expect($fetch("/api/_redirects/%2Ffoobar")).resolves.toMatchObject({
      data: { to: "/plain" }
    });
  });

  it("invalidates cached endpoints after a source refresh changes a redirect", async () => {
    await expect($fetch("/api/_redirects/%2Frefresh-origin")).resolves.toMatchObject({
      data: { to: "/refresh-first" }
    });
    expect((await $fetch<{ data: string[] }>("/api/_test/cache-keys")).data).toContainEqual(
      expect.stringContaining("redirects:lookup")
    );
    await $fetch("/api/_test/change-source", { method: "POST" });
    await expect($fetch("/api/_test/refresh", { method: "POST" })).resolves.toMatchObject({
      data: { "/refresh-origin": { to: "/refresh-second" } }
    });
    await expect($fetch<{ data: string[] }>("/api/_test/cache-keys")).resolves.toEqual({
      data: []
    });

    await expect($fetch("/api/_redirects/%2Frefresh-origin")).resolves.toMatchObject({
      data: { to: "/refresh-second" }
    });
  });
});
