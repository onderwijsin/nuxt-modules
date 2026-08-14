import { readItems } from "@directus/sdk";
import { describe, expect, it, vi } from "vitest";

import { createDirectusRestClient } from "../../src/shared/directus-clients";

type TestSchema = { pages: { id: string }[] };

describe("createDirectusRestClient", () => {
  it("creates a REST client with an optional access token", async () => {
    const fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer build-token");
      return new Response(JSON.stringify({ data: [] }), {
        headers: { "content-type": "application/json" }
      });
    });

    const client = createDirectusRestClient<TestSchema>({
      baseUrl: "https://directus.example.test",
      fetch,
      accessToken: "build-token"
    });

    await expect(client.request(readItems("pages"))).resolves.toEqual([]);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("does not attach authorization when no access token is provided", async () => {
    const fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("authorization")).toBeNull();
      return new Response(JSON.stringify({ data: [] }), {
        headers: { "content-type": "application/json" }
      });
    });

    const client = createDirectusRestClient<TestSchema>({
      baseUrl: "https://directus.example.test",
      fetch
    });

    await expect(client.request(readItems("pages"))).resolves.toEqual([]);
  });
});
