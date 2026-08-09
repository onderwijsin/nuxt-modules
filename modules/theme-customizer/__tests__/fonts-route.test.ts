import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchFonts = vi.hoisted(() => vi.fn());
const getQuery = vi.hoisted(() => vi.fn());
const useRuntimeConfig = vi.hoisted(() => vi.fn());
const enforceRateLimit = vi.hoisted(() => vi.fn());

vi.mock("ofetch", () => ({ ofetch: fetchFonts }));
vi.mock("nitropack/runtime", () => ({
  defineCachedFunction: (handler: unknown) => handler,
  useRuntimeConfig
}));
vi.mock("@onderwijsin/nuxt-simple-rate-limiter/runtime", () => ({ enforceRateLimit }));
vi.mock("h3", async (importOriginal) => ({
  ...(await importOriginal<typeof import("h3")>()),
  getQuery
}));

import fontsHandler from "../src/runtime/server/api/theme/fonts.get";

describe("theme fonts API route", () => {
  beforeEach(() => {
    fetchFonts.mockReset();
    getQuery.mockReset();
    useRuntimeConfig.mockImplementation(
      (event: { context: { nitro: { runtimeConfig: unknown } } }) =>
        event.context.nitro.runtimeConfig
    );
  });

  it("returns configured fallback fonts without an API key", async () => {
    getQuery.mockReturnValue({ q: "inter" });

    await expect(
      fontsHandler({
        context: {
          nitro: {
            runtimeConfig: { public: { themeCustomizer: { googleFonts: { families: ["Inter"] } } } }
          }
        }
      } as never)
    ).resolves.toEqual([{ label: "Inter", value: "Inter" }]);
    expect(fetchFonts).not.toHaveBeenCalled();
  });

  it("fetches and filters Google Fonts metadata through the server key", async () => {
    getQuery.mockReturnValue({ q: "sans" });
    fetchFonts.mockResolvedValue({
      items: [{ family: "DM Sans" }, { family: "Roboto" }]
    });

    await expect(
      fontsHandler({
        context: { nitro: { runtimeConfig: { themeCustomizerGoogleFontsApiKey: "test-key" } } }
      } as never)
    ).resolves.toEqual([{ label: "DM Sans", value: "DM Sans" }]);
    expect(fetchFonts).toHaveBeenCalledWith("https://www.googleapis.com/webfonts/v1/webfonts", {
      query: { capability: "WOFF2", key: "test-key", sort: "popularity" }
    });
  });

  it("uses consuming-app font families when no API key is configured", async () => {
    getQuery.mockReturnValue({ q: "brand" });

    await expect(
      fontsHandler({
        context: {
          nitro: {
            runtimeConfig: {
              public: {
                themeCustomizer: { googleFonts: { families: ["Brand Sans", "Display"] } }
              }
            }
          }
        }
      } as never)
    ).resolves.toEqual([{ label: "Brand Sans", value: "Brand Sans" }]);
    expect(fetchFonts).not.toHaveBeenCalled();
  });
});
