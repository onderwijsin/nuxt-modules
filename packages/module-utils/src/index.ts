/**
 * Determines whether a value is a non-null object record.
 *
 * @param value - The value to inspect.
 * @returns Whether the value can be treated as a string-keyed record.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
