import { describe, expect, it, vi } from "vitest";

import { fetchDirectusItemByPath } from "../src/runtime/items/fetch-by-path";

const normalPreview = {
  isPreview: false,
  queryKeys: { preview: "preview", token: "token", version: "version", id: "id" }
};

describe("Directus item lookup command selection", () => {
  it("uses readItems with a limit for normal lookups and returns null when empty", async () => {
    const execute = vi.fn().mockResolvedValue([]);

    await expect(
      fetchDirectusItemByPath(
        "pages",
        { filter: { slug: { _eq: "home" } } },
        normalPreview,
        execute
      )
    ).resolves.toBeNull();

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0]?.[0]()).toMatchObject({
      path: "/items/pages",
      params: expect.objectContaining({ limit: 1 })
    });
  });

  it("uses readItem with the preview ID and version", async () => {
    const execute = vi.fn().mockResolvedValue({ id: "page-1" });

    await expect(
      fetchDirectusItemByPath(
        "pages",
        { fields: ["id"] },
        { isPreview: true, id: "page-1", version: "test" },
        execute
      )
    ).resolves.toEqual({ id: "page-1" });

    expect(execute.mock.calls[0]?.[0]()).toMatchObject({
      path: "/items/pages/page-1",
      params: expect.objectContaining({ version: "test" })
    });
  });
});
