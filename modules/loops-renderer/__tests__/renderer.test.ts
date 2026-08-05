import { describe, expect, it } from "vitest";
import {
  createLoopsRendererConfig,
  hasRendererSpecificContent
} from "../src/runtime/app/utils/renderer";

describe("renderer utilities", () => {
  it("merges per-renderer settings over app settings and defaults", () => {
    expect(
      createLoopsRendererConfig(
        { applyInlineStyles: false, evaluate: { onMissingVariable: true } },
        { applyInlineStyles: true, evaluate: { onInvalidCondition: true } }
      )
    ).toEqual({
      applyInlineStyles: false,
      evaluate: {
        onMissingVariable: true,
        onInvalidCondition: true,
        onInvalidComparison: false
      }
    });
  });

  it("recognizes Quote and line-break content omitted by core visibility checks", () => {
    expect(
      hasRendererSpecificContent([{ type: "element", name: "Quote", attributes: {}, children: [] }])
    ).toBe(true);
    expect(
      hasRendererSpecificContent([{ type: "element", name: "Br", attributes: {}, children: [] }])
    ).toBe(true);
  });

  it("finds renderer-specific content inside expanded components", () => {
    expect(
      hasRendererSpecificContent([
        {
          type: "element",
          name: "Component",
          attributes: {},
          children: [{ type: "element", name: "Br", attributes: {}, children: [] }]
        }
      ])
    ).toBe(true);
  });

  it("ignores metadata and unknown nodes", () => {
    expect(
      hasRendererSpecificContent([
        { type: "element", name: "Style", attributes: {}, children: [] },
        { type: "element", name: "Unknown", attributes: {}, children: [] },
        { type: "text", value: "\n" }
      ])
    ).toBe(false);
  });
});
