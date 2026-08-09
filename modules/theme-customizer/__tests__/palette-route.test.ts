import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchPalette = vi.hoisted(() => vi.fn());
const getQuery = vi.hoisted(() => vi.fn());
const enforceRateLimit = vi.hoisted(() => vi.fn());

vi.mock("ofetch", () => ({ ofetch: fetchPalette }));
vi.mock("nitropack/runtime", () => ({
  defineCachedFunction: (handler: unknown) => handler,
  useRuntimeConfig: () => ({ public: {} })
}));
vi.mock("@onderwijsin/nuxt-simple-rate-limiter/runtime", () => ({ enforceRateLimit }));
vi.mock("h3", async (importOriginal) => ({
  ...(await importOriginal<typeof import("h3")>()),
  getQuery
}));

import paletteHandler from "../src/runtime/server/api/theme/palette.get";

describe("theme palette API route", () => {
  beforeEach(() => {
    fetchPalette.mockReset();
    getQuery.mockReset();
  });

  it("rejects invalid hex query values", async () => {
    getQuery.mockReturnValue({ hex: "blue" });

    await expect(paletteHandler({} as never)).rejects.toMatchObject({ statusCode: 400 });
    expect(fetchPalette).not.toHaveBeenCalled();
  });

  it("proxies valid hex values", async () => {
    const response = {
      hex: "ABCDEF",
      shades: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((level) => ({
        level,
        hex: "123456"
      }))
    };
    fetchPalette.mockResolvedValue(response);
    getQuery.mockReturnValue({ hex: "#abcdef" });

    await expect(paletteHandler({} as never)).resolves.toEqual(response);
    expect(fetchPalette).toHaveBeenCalledWith("https://colorfyi.com/api/shades/ABCDEF/", {
      timeout: 5_000
    });
  });

  it("maps upstream failures to a bad gateway error", async () => {
    fetchPalette.mockRejectedValue(new Error("upstream unavailable"));
    getQuery.mockReturnValue({ hex: "#fedcba" });

    await expect(paletteHandler({} as never)).rejects.toMatchObject({ statusCode: 502 });
  });
});
