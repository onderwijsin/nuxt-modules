import { describe, expect, it, vi } from "vitest";
import { applyInlineStyles, type LoopsLmxElement } from "@onderwijsin/loops-core";
import { resolveLoopsRendererStyles } from "../src/runtime/app/utils/styles";
import { loopsRendererOptionsSchema } from "../src/config/options.schema";
import type { LoopsRendererColorMapper } from "../src/runtime/types";

const node: LoopsLmxElement = {
  type: "element",
  name: "Button",
  attributes: {
    href: "https://example.com",
    textColor: "#fff",
    bgColor: "#123456",
    borderColor: "#FFF",
    paddingTop: "24",
    borderRadius: "8",
    fontSize: "16"
  },
  children: []
};

describe("renderer color mapping", () => {
  it("accepts only explicit light/dark source themes without guessing a default", () => {
    expect(loopsRendererOptionsSchema.parse({}).sourceTheme).toBeUndefined();
    expect(loopsRendererOptionsSchema.parse({ sourceTheme: "dark" }).sourceTheme).toBe("dark");
    expect(loopsRendererOptionsSchema.safeParse({ sourceTheme: "system" }).success).toBe(false);
  });

  it("preserves all validated styles without a mapper or for undefined results", () => {
    const original = applyInlineStyles(node.attributes);
    expect(resolveLoopsRendererStyles(node, {}).styles).toEqual(original);
    expect(resolveLoopsRendererStyles(node, { mapColor: () => undefined }).styles).toEqual(
      original
    );
  });

  it("supports exact role-specific lookups while retaining unmatched colors", () => {
    const mapping: Record<string, string> = {
      "color:#fff": "var(--button-text)",
      "backgroundColor:#123456": "var(--button-background)"
    };
    const { styles } = resolveLoopsRendererStyles(node, {
      mapColor: (color, context) => mapping[`${context.property}:${color}`]
    });
    expect(styles.color).toBe("var(--button-text)");
    expect(styles.backgroundColor).toBe("var(--button-background)");
    expect(styles.borderColor).toBe("#FFF");
  });

  it("maps only colors and supplies the original foreground/background pair for every role", () => {
    const snapshot = JSON.stringify(node);
    const mapColor = vi.fn<LoopsRendererColorMapper>(
      (color, context) => `var(--${context.property})`
    );
    const { styles } = resolveLoopsRendererStyles(
      node,
      { mapColor, sourceTheme: "dark", targetTheme: "light" },
      "#abcdef"
    );

    expect(styles).toEqual({
      ...applyInlineStyles(node.attributes),
      color: "var(--color)",
      backgroundColor: "var(--backgroundColor)",
      borderColor: "var(--borderColor)"
    });
    for (const property of ["color", "backgroundColor", "borderColor"]) {
      expect(mapColor).toHaveBeenCalledWith(expect.any(String), {
        property,
        nodeType: "element",
        nodeName: "Button",
        colors: { color: "#fff", backgroundColor: "#123456", borderColor: "#FFF" },
        backgroundColor: "#123456",
        parentBackgroundColor: "#abcdef",
        sourceTheme: "dark",
        targetTheme: "light"
      });
    }
    expect(JSON.stringify(node)).toBe(snapshot);
  });

  it("never passes invalid source styles or persisted CSS variables to the mapper", () => {
    const mapColor = vi.fn(() => "var(--safe-color)");
    const invalid: LoopsLmxElement = {
      ...node,
      attributes: {
        textColor: "var(--injected)",
        bgColor: "red;display:none",
        borderColor: "url(https://example.com)",
        style: "color: red",
        paddingTop: "24"
      }
    };
    expect(resolveLoopsRendererStyles(invalid, { mapColor }).styles).toEqual({
      paddingTop: "24px"
    });
    expect(mapColor).not.toHaveBeenCalled();
  });

  it("skips mapping and source styles when inline styles are disabled", () => {
    const mapColor = vi.fn(() => "#000");
    expect(resolveLoopsRendererStyles(node, { applyInlineStyles: false, mapColor }).styles).toEqual(
      {}
    );
    expect(mapColor).not.toHaveBeenCalled();
  });

  it("passes ancestor backgrounds through without assuming a source or target theme", () => {
    const mapColor = vi.fn(() => undefined);
    resolveLoopsRendererStyles(
      { ...node, attributes: { textColor: "#123" } },
      { mapColor },
      "#456"
    );
    expect(mapColor).toHaveBeenCalledWith(
      "#123",
      expect.objectContaining({
        colors: { color: "#123" },
        backgroundColor: "#456",
        parentBackgroundColor: "#456",
        sourceTheme: undefined,
        targetTheme: undefined
      })
    );
  });
});
