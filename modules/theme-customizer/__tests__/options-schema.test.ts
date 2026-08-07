import { describe, expect, it } from "vitest";

import { themeOptionsSchema } from "../src/config/options.schema";
import type { ThemePalette } from "../src/types";

const palette = Object.fromEntries(
  [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((shade) => [shade, "#123456"])
) as ThemePalette;

describe("theme option validation", () => {
  it("accepts complete custom groups and preserves unknown group names", () => {
    const result = themeOptionsSchema.safeParse({
      primary: { ocean: palette },
      accent: { violet: palette }
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toMatchObject({
      primary: { ocean: palette },
      accent: { violet: palette }
    });
  });

  it("accepts an optional Google Fonts API key without treating it as a color group", () => {
    const result = themeOptionsSchema.safeParse({
      googleFonts: { apiKey: "test-key" },
      primary: { ocean: palette }
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toMatchObject({
      googleFonts: { apiKey: "test-key" }
    });
  });

  it("normalizes configured font families", () => {
    const result = themeOptionsSchema.safeParse({
      googleFonts: { families: ["Inter", " Inter ", "DM Sans"] },
      primary: { ocean: palette }
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toMatchObject({
      googleFonts: { families: ["Inter", "DM Sans"] }
    });
  });

  it("accepts typed initial defaults for fonts, radius, and color groups", () => {
    const result = themeOptionsSchema.safeParse({
      primary: { ocean: palette },
      defaults: { primary: "ocean", font: " Inter ", radius: 0.375, accent: "violet" }
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toMatchObject({
      defaults: { primary: "ocean", font: "Inter", radius: 0.375, accent: "violet" }
    });
  });

  it("rejects invalid initial defaults", () => {
    expect(
      themeOptionsSchema.safeParse({
        primary: { ocean: palette },
        defaults: { radius: -1, primary: 42 }
      }).success
    ).toBe(false);
  });

  it("requires a primary palette when enabled", () => {
    const result = themeOptionsSchema.safeParse({ enabled: true, primary: {} });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("minstens één palet");
    }
  });

  it("rejects invalid shade keys and values", () => {
    const result = themeOptionsSchema.safeParse({
      primary: {
        ocean: {
          ...palette,
          500: "blue",
          1000: "#ffffff"
        }
      }
    });

    expect(result.success).toBe(false);
  });
});
