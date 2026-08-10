import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const { $fetch } = vi.hoisted(() => ({ $fetch: vi.fn() }));

vi.mock("#app", () => ({
  useRuntimeConfig: () => ({
    public: { redirects: { storeRefreshInterval: 60, dynamicMatching: true } }
  })
}));

vi.mock("ofetch", () => ({ $fetch }));

import { useRedirectsStore } from "../src/runtime/app/stores/redirects";

describe("redirects store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    $fetch.mockReset();
  });

  it("stores the manifest object and resolves exact-query redirects before path fallbacks", async () => {
    $fetch.mockResolvedValue({
      data: {
        "/search": { from: "/search", to: "/all", statusCode: 302 },
        "/search?q=legacy": {
          from: "/search?q=legacy",
          to: "/archive",
          statusCode: 301
        }
      }
    });
    const store = useRedirectsStore();

    await store.refresh(true);

    expect(store.records).toEqual({
      "/search": { from: "/search", to: "/all", statusCode: 302 },
      "/search?q=legacy": { from: "/search?q=legacy", to: "/archive", statusCode: 301 }
    });
    expect(store.find("/search?q=legacy")).toMatchObject({ to: "/archive" });
    expect(store.find("/search?q=current")).toMatchObject({ to: "/all" });
  });

  it("does not refetch within the configured interval unless forced", async () => {
    $fetch.mockResolvedValue({ data: {} });
    const store = useRedirectsStore();

    await store.refresh(true);
    await store.refresh();
    await store.refresh(true);

    expect($fetch).toHaveBeenCalledTimes(2);
    expect($fetch).toHaveBeenCalledWith("/api/_redirects");
  });

  it("releases the refresh lock after a failed request", async () => {
    $fetch
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce({ data: {} });
    const store = useRedirectsStore();

    await expect(store.refresh(true)).rejects.toThrow("network unavailable");
    expect(store.isRefreshing).toBe(false);
    await expect(store.refresh(true)).resolves.toBeUndefined();
    expect($fetch).toHaveBeenCalledTimes(2);
  });
});
