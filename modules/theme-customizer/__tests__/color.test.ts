import { describe, expect, it, vi } from "vitest";

import { normalizeCssColorToHex } from "../src/runtime/app/utils/color";
import { adjacentThemeShade, colorLabel, themeTextClass } from "../src/runtime/app/utils/theme";

describe("normalizeCssColorToHex", () => {
  it("normalizes hex values", () => {
    expect(normalizeCssColorToHex("#ABCDEF")).toBe("#abcdef");
  });

  it("converts rgb and rgba values", () => {
    expect(normalizeCssColorToHex("rgb(1, 2, 255)")).toBe("#0102ff");
    expect(normalizeCssColorToHex("rgba(16, 32, 48, 0.5)")).toBe("#102030");
  });

  it("returns unresolved values without a canvas context", () => {
    expect(normalizeCssColorToHex("var(--unknown-color)")).toBe("var(--unknown-color)");
  });

  it("resolves named colors with a canvas context", () => {
    const clearRect = vi.fn();
    const fillRect = vi.fn();
    const context = {
      clearRect,
      fillRect,
      fillStyle: "",
      getImageData: vi.fn(() => ({ data: [18, 52, 86, 255] }))
    };

    expect(normalizeCssColorToHex("rebeccapurple", context as never)).toBe("#123456");
    expect(clearRect).toHaveBeenCalledWith(0, 0, 1, 1);
    expect(fillRect).toHaveBeenCalledWith(0, 0, 1, 1);
  });

  it("formats labels and chooses adjacent shade contrast values", () => {
    expect(colorLabel("sunset-orange")).toBe("Sunset Orange");
    expect(colorLabel("  sea_blue ")).toBe("Sea Blue");
    expect(adjacentThemeShade(50)).toBe(100);
    expect(adjacentThemeShade(500)).toBe(400);
    expect(adjacentThemeShade(950)).toBe(900);
    expect(themeTextClass(400)).toBe("text-black");
    expect(themeTextClass(500)).toBe("text-white");
  });
});
