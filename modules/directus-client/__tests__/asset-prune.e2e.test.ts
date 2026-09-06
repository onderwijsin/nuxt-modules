import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { afterAll, describe, expect, it } from "vitest";
import { $fetch, setupFixture } from "../../../packages/test-utils/src";

const cacheDirectory = mkdtempSync(join(tmpdir(), "nuxt-directus-prune-"));
const upstream = createServer((request, response) => {
  const asset = request.url?.split("/", 3)[2];
  if (asset === "asset-a" || asset === "asset-b") {
    response.writeHead(200, { "cache-control": "public", "content-type": "text/plain" });
    response.end(asset);
    return;
  }
  response.writeHead(404);
  response.end();
});

await new Promise<void>((resolve, reject) => {
  upstream.once("error", reject);
  upstream.listen(0, "127.0.0.1", resolve);
});
const address = upstream.address();
if (!address || typeof address === "string") throw new Error("Mock asset server did not start");
process.env.DIRECTUS_PRUNE_E2E_URL = `http://127.0.0.1:${address.port}`;
process.env.DIRECTUS_PRUNE_E2E_CACHE_DIR = cacheDirectory;

await setupFixture(import.meta.url, "prune", { dev: false });

async function getKeys(): Promise<string[]> {
  return await $fetch<string[]>("/api/directus-asset-cache-keys");
}

async function waitFor(condition: () => Promise<boolean>, timeout = 2_000): Promise<void> {
  const deadline = Date.now() + timeout;
  while (!(await condition())) {
    if (Date.now() >= deadline) {
      throw new Error(`Timed out waiting for cache state: ${(await getKeys()).join(", ")}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

describe("Directus asset-cache pruning end to end", () => {
  afterAll(async () => {
    delete process.env.DIRECTUS_PRUNE_E2E_URL;
    delete process.env.DIRECTUS_PRUNE_E2E_CACHE_DIR;
    await new Promise<void>((resolve, reject) => {
      upstream.close((error) => (error ? reject(error) : resolve()));
    });
    rmSync(cacheDirectory, { force: true, recursive: true });
  });

  it("removes stale entries while retaining fresh and foreign storage data", async () => {
    await expect($fetch<string>("/_directus/assets/asset-a")).resolves.toBe("asset-a");
    await waitFor(async () => (await getKeys()).some((key) => key !== "foreign-key"));
    const keysAfterA = await getKeys();
    expect(keysAfterA.length, keysAfterA.join(", ")).toBeGreaterThan(0);

    await expect($fetch("/api/directus-asset-cache-foreign", { method: "POST" })).resolves.toEqual({
      created: true
    });

    await new Promise((resolve) => setTimeout(resolve, 1_100));
    await expect($fetch<string>("/_directus/assets/asset-b")).resolves.toBe("asset-b");

    let keysForB: string[] = [];
    await waitFor(async () => {
      const keys = (await getKeys()).filter((key) => key !== "foreign-key");
      keysForB = keys.filter((key) => !keysAfterA.includes(key));
      return keysForB.length > 0;
    });

    await waitFor(async () => {
      const keys = await getKeys();
      return keysAfterA.every((key) => !keys.includes(key));
    });

    const finalKeys = await getKeys();
    expect(finalKeys).toEqual(expect.arrayContaining(keysForB));
    expect(finalKeys).toContain("foreign-key");
  });
});
