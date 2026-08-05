import { describe, expect, it } from "vitest";
import { createLoopsRendererConfig } from "../src/runtime/app/utils/renderer";

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
});
