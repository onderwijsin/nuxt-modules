import { afterEach, describe, expect, it, vi } from "vitest";
import type { LoopsRendererColorContext, LoopsRendererColorMap } from "../src/runtime/types";
import { createLoopsColorMapper as createExactMapper } from "../src/runtime/app/utils/color-mapper";
import { createLoopsColorMapper as createApproximateMapper } from "../src/runtime/app/utils/color-mapper-approximation";
import { oklabDistance, sourceHexToOklab } from "../src/runtime/app/utils/oklab";
import * as oklab from "../src/runtime/app/utils/oklab";
import { loopsRendererOptionsSchema } from "../src/config/options.schema";

const context: LoopsRendererColorContext = {
  property: "color",
  nodeType: "element",
  nodeName: "Paragraph",
  colors: {},
  backgroundColor: undefined,
  parentBackgroundColor: undefined,
  sourceTheme: "light",
  targetTheme: "dark"
};

const strategies: [string, typeof createExactMapper][] = [
  ["exact", createExactMapper],
  ["approximate", createApproximateMapper]
];
for (const [name, createMapper] of strategies) {
  describe(`${name} color mapper`, () => {
    it("normalizes exact source keys while keeping role-specific CSS token output", () => {
      const mapper = createMapper({
        color: { "#FFF": "var(--text)" },
        backgroundColor: { "#ffffff": "var(--surface)" }
      });
      expect(mapper("#ffffff", context)).toBe("var(--text)");
      expect(mapper("#fff", { ...context, property: "backgroundColor" })).toBe("var(--surface)");
      expect(mapper("#fff", { ...context, property: "borderColor" })).toBeUndefined();
      expect(mapper("var(--source)", context)).toBeUndefined();
    });

    it("takes an independent palette snapshot", () => {
      const mappings: LoopsRendererColorMap = { color: { "#fff": "var(--original)" } };
      const mapper = createMapper(mappings);
      mappings.color = { "#fff": "var(--changed)" };
      expect(mapper("#fff", context)).toBe("var(--original)");
    });

    it("rejects invalid or ambiguous normalized palette keys", () => {
      expect(() => createMapper({ color: { red: "#fff" } })).toThrow(TypeError);
      expect(() => createMapper({ color: { "#fff": "#111", "#FFFFFF": "#222" } })).toThrow(
        TypeError
      );
    });
  });
}

describe("approximation opt-in", () => {
  afterEach(() => vi.restoreAllMocks());
  it("defaults off and validates the module switch", () => {
    expect(loopsRendererOptionsSchema.parse({}).colorMapping.approximation).toBe(false);
    expect(
      loopsRendererOptionsSchema.parse({ colorMapping: { approximation: true } }).colorMapping
        .approximation
    ).toBe(true);
    expect(
      loopsRendererOptionsSchema.safeParse({ colorMapping: { approximation: "yes" } }).success
    ).toBe(false);
  });

  it("keeps near colors unchanged with the exact-only implementation, even with a distance option", () => {
    expect(
      createExactMapper({ color: { "#ffffff": "var(--text)" } }, { maxDeltaE: 1 })(
        "#fefefe",
        context
      )
    ).toBeUndefined();
  });

  it("reuses the closest source mapping only within the matching role", () => {
    const mapper = createApproximateMapper({
      color: { "#ffffff": "var(--light)", "#111111": "var(--dark)" },
      backgroundColor: { "#fefefe": "var(--surface)" }
    });
    expect(mapper("#fefefe", context)).toBe("var(--light)");
    expect(mapper("#121212", context)).toBe("var(--dark)");
    expect(mapper("#fefefe", { ...context, property: "backgroundColor" })).toBe("var(--surface)");
    expect(mapper("#ff0000", context)).toBeUndefined();
  });

  it("gives exact matches precedence even when approximation is allowed a large distance", () => {
    const mapper = createApproximateMapper(
      { color: { "#ffffff": "var(--nearest)", "#fefefe": "var(--exact)" } },
      { maxDeltaE: 1 }
    );
    expect(mapper("#fefefe", context)).toBe("var(--exact)");
  });

  it("honors inclusive distance boundaries and zero-distance exact-only matching", () => {
    const mappings = { color: { "#ffffff": "var(--text)" } };
    const distance = oklabDistance(sourceHexToOklab("#ffffff"), sourceHexToOklab("#fefefe"));
    expect(createApproximateMapper(mappings, { maxDeltaE: distance })("#fefefe", context)).toBe(
      "var(--text)"
    );
    expect(
      createApproximateMapper(mappings, { maxDeltaE: distance / 2 })("#fefefe", context)
    ).toBeUndefined();
    expect(createApproximateMapper(mappings, { maxDeltaE: 0 })("#fefefe", context)).toBeUndefined();
    expect(createApproximateMapper(mappings, { maxDeltaE: 0 })("#fff", context)).toBe(
      "var(--text)"
    );
  });

  it.each([-1, NaN, Infinity])("rejects an invalid maximum distance: %s", (maxDeltaE) => {
    expect(() => createApproximateMapper({}, { maxDeltaE })).toThrow(RangeError);
  });

  it("does not depend on palette insertion order", () => {
    const first = createApproximateMapper(
      { color: { "#fff": "light", "#000": "dark" } },
      { maxDeltaE: 1 }
    );
    const second = createApproximateMapper(
      { color: { "#000": "dark", "#fff": "light" } },
      { maxDeltaE: 1 }
    );
    expect(first("#777777", context)).toBe(second("#777777", context));
  });

  it("breaks equal-distance ties by canonical source hex order", () => {
    vi.spyOn(oklab, "oklabDistance").mockReturnValue(0.01);
    const mapper = createApproximateMapper({ color: { "#fff": "light", "#000": "dark" } });
    expect(mapper("#777777", context)).toBe("dark");
  });
});

describe("source color distances", () => {
  it("agrees with reference black, white and red OKLab coordinates", () => {
    expect(sourceHexToOklab("#000000")).toEqual({ lightness: 0, a: 0, b: 0 });
    const white = sourceHexToOklab("#ffffff");
    expect(white.lightness).toBeCloseTo(1, 6);
    expect(white.a).toBeCloseTo(0, 6);
    expect(white.b).toBeCloseTo(0, 6);
    const red = sourceHexToOklab("#ff0000");
    expect(red.lightness).toBeCloseTo(0.62795536, 6);
    expect(red.a).toBeCloseTo(0.22486306, 6);
    expect(red.b).toBeCloseTo(0.1258463, 6);
  });
});
