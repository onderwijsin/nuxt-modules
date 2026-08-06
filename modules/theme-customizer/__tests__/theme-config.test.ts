import { describe, expect, it } from "vitest";

import {
  configuredAppColors,
  configuredGroups,
  configuredRuntimeGroups,
  configuredUiColors,
  generateThemeCss
} from "../src/config/theme";
import type { ThemePalette } from "../src/types";

const palette = Object.fromEntries(
  [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((shade) => [shade, "#123456"])
) as ThemePalette;

describe("theme configuration helpers", () => {
  it("extracts palette groups and ignores scalar options", () => {
    expect(configuredGroups({ enabled: true, primary: { ocean: palette } })).toEqual({
      primary: { ocean: palette }
    });
  });

  it("generates palette tokens and semantic aliases", () => {
    const css = generateThemeCss(
      { primary: { ocean: palette }, accent: { coral: palette } },
      "@theme static { --color-gray-500: #777777; }"
    );

    expect(css).toContain(":root { --color-gray-500: #777777; }");
    expect(css).toContain("--color-ocean-500: #123456;");
    expect(css).toContain("--color-primary-500: var(--color-ocean-500);");
  });

  it("does not emit a redundant alias when a group matches its token", () => {
    const css = generateThemeCss(
      { primary: { primary: palette }, neutral: { gray: palette } },
      "@theme static {}"
    );

    expect(css).not.toContain("--color-primary-500: var(--color-primary-500);");
    expect(css).toContain("--color-neutral-500: var(--color-gray-500);");
  });

  it("derives consumer configuration from the configured groups", () => {
    const groups = { primary: { ocean: palette }, accent: { coral: palette } };

    expect(configuredRuntimeGroups(groups)).toEqual({
      primary: ["ocean"],
      neutral: [],
      accent: ["coral"]
    });
    expect(configuredUiColors(groups, ["primary", "accent"])).toEqual(["primary", "accent"]);
    expect(configuredAppColors(groups, { primary: "existing" })).toEqual({
      primary: "existing",
      accent: "coral"
    });
    expect(configuredUiColors({ primary: { ocean: palette }, success: { ok: palette } })).toEqual(
      []
    );
  });

  it("uses valid configured group defaults and falls back to the first palette", () => {
    const groups = {
      primary: { ocean: palette, forest: palette },
      accent: { coral: palette }
    };

    expect(configuredAppColors(groups, {}, { primary: "forest", accent: "missing" })).toEqual({
      primary: "forest",
      accent: "coral"
    });
    expect(generateThemeCss(groups, "@theme static {}", { primary: "forest" })).toContain(
      "--color-primary-500: var(--color-forest-500);"
    );
  });
});
