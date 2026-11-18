import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick } from "vue";
import { useGoogleFonts } from "../src/runtime/app/composables/google-fonts.client";

const fetchFonts = vi.hoisted(() => vi.fn());
vi.mock("ofetch", () => ({ ofetch: fetchFonts }));
vi.mock("#imports", async () => ({
  ...(await import("vue")),
  useRuntimeConfig: () => ({
    public: { themeCustomizer: { googleFonts: { families: ["Inter", "Public Sans"] } } }
  })
}));

describe("theme font search", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it("loads lazily and requests only the final search term after 250ms", async () => {
    vi.useFakeTimers();
    const scope = effectScope();
    try {
      const fonts = scope.run(useGoogleFonts);
      if (!fonts) throw new Error("Font search did not initialize");
      expect(fonts.items.value.map((font) => font.value)).toEqual(["Inter", "Public Sans"]);
      expect(fetchFonts).not.toHaveBeenCalled();
      fetchFonts.mockResolvedValue([{ label: "Inter", value: "Inter" }]);
      await fonts.loadFonts();
      fonts.searchTerm.value = "pub";
      await nextTick();
      fonts.searchTerm.value = "inter";
      await nextTick();
      await vi.advanceTimersByTimeAsync(249);
      expect(fetchFonts).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(fetchFonts).toHaveBeenCalledTimes(2);
      expect(fetchFonts).toHaveBeenLastCalledWith("/api/_theme-customizer/fonts", {
        query: { q: "inter" }
      });
      expect(fonts.items.value).toEqual([{ label: "Inter", value: "Inter" }]);
    } finally {
      scope.stop();
    }
  });
});
