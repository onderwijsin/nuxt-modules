import { describe, expect, it } from "vitest";
import { $fetch, fetch, setupFixture } from "../../../packages/test-utils/src";

const adminHeaders = { "x-admin-token": "fixture-admin-token" };

describe("storage-admin module in production", async () => {
  await setupFixture(import.meta.url, "production", { dev: false });

  it("renders the fixture through SSR but does not register the development browser", async () => {
    await expect($fetch<string>("/")).resolves.toContain("Storage admin production fixture");

    const browserRoute = await $fetch<string>("/_storage");
    expect(browserRoute).toContain("Storage admin production fixture");
    expect(browserRoute).not.toContain("Storage entries");
  });

  it("requires production authentication and supports a CRUD sequence", async () => {
    const unauthorized = await fetch("/api/_storage/cache/items/pages:welcome", {
      method: "PUT",
      body: JSON.stringify({ value: { title: "Welcome" } }),
      headers: { "content-type": "application/json" }
    });
    expect(unauthorized.status).toBe(401);

    await expect(
      $fetch("/api/_storage/cache/items/pages:welcome", {
        method: "PUT",
        headers: adminHeaders,
        body: { value: { title: "Welcome" } }
      })
    ).resolves.toMatchObject({ data: { key: "pages:welcome", updated: true } });

    await expect(
      $fetch("/api/_storage/cache/items?prefix=pages", { headers: adminHeaders })
    ).resolves.toMatchObject({ data: { items: [{ key: "pages:welcome" }], total: 1 } });

    await expect(
      $fetch("/api/_storage/cache/items/pages:welcome", { headers: adminHeaders })
    ).resolves.toMatchObject({ data: { value: { title: "Welcome" } } });

    await expect(
      $fetch("/api/_storage/cache/items/pages:welcome", {
        method: "DELETE",
        headers: adminHeaders
      })
    ).resolves.toMatchObject({ data: { key: "pages:welcome", deleted: true } });
  });
});
