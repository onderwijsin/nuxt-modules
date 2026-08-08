import { describe, expect, it } from "vitest";
import {
  hasKey,
  hasKeys,
  isArray,
  isBoolean,
  isDefined,
  isFiniteNumber,
  isFunction,
  isInteger,
  isNonBlankString,
  isNonEmptyString,
  isNumber,
  isRecord,
  isString
} from "../../src/shared/guards";

describe("primitive runtime guards", () => {
  it("distinguishes defined, record, array, string, boolean, and function values", () => {
    expect(isDefined(undefined)).toBe(false);
    expect(isDefined(null)).toBe(true);
    expect(isDefined(false)).toBe(true);
    expect(isDefined(0)).toBe(true);
    expect(isDefined("")).toBe(true);
    expect(isRecord({})).toBe(true);
    expect(isRecord(Object.create(null))).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(isRecord(undefined)).toBe(false);
    expect(isArray([])).toBe(true);
    expect(isArray({})).toBe(false);
    expect(isString("")).toBe(true);
    expect(isString(42)).toBe(false);
    expect(isBoolean(false)).toBe(true);
    expect(isBoolean(0)).toBe(false);
    expect(isFunction(() => undefined)).toBe(true);
    expect(isFunction(class Example {})).toBe(true);
    expect(isFunction({})).toBe(false);
  });

  it("distinguishes empty and blank strings", () => {
    expect(isNonEmptyString("")).toBe(false);
    expect(isNonEmptyString(" ")).toBe(true);
    expect(isNonEmptyString(42)).toBe(false);
    expect(isNonBlankString(" ")).toBe(false);
    expect(isNonBlankString("\n\t")).toBe(false);
    expect(isNonBlankString(" text ")).toBe(true);
  });

  it("distinguishes number type, finite numbers, and integers", () => {
    expect(isNumber(Number.NaN)).toBe(true);
    expect(isNumber(Infinity)).toBe(true);
    expect(isNumber("1")).toBe(false);
    expect(isFiniteNumber(Number.NaN)).toBe(false);
    expect(isFiniteNumber(Infinity)).toBe(false);
    expect(isFiniteNumber(-Infinity)).toBe(false);
    expect(isFiniteNumber(1.5)).toBe(true);
    expect(isInteger(1)).toBe(true);
    expect(isInteger(-1)).toBe(true);
    expect(isInteger(1.5)).toBe(false);
    expect(isInteger(Number.NaN)).toBe(false);
  });

  it("checks own keys and properties only", () => {
    const inherited = Object.create({ inherited: true }) as Record<string, unknown>;
    const symbol = Symbol("own");
    inherited.own = true;
    Object.defineProperty(inherited, symbol, { value: true, enumerable: true });

    expect(hasKeys(inherited)).toBe(true);
    expect(hasKey(inherited, "own")).toBe(true);
    expect(hasKey(inherited, "inherited")).toBe(false);
    expect(hasKey(inherited, symbol)).toBe(true);
    expect(hasKeys({})).toBe(false);
  });
});
