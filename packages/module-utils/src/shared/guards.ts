/** Returns true when a value is not `undefined`.
 * @param value - Value to inspect.
 * @returns Whether the value is defined.
 */
export function isDefined<T>(value: T): value is Exclude<T, undefined> {
  return value !== undefined;
}

/** Returns true for non-null objects that are not arrays.
 * @param value - Value to inspect.
 * @returns Whether the value is a record.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Returns true when a value is an array.
 * @param value - Value to inspect.
 * @returns Whether the value is an array.
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/** Returns true when a value has the JavaScript string type.
 * @param value - Value to inspect.
 * @returns Whether the value is a string.
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/** Returns true for strings with at least one character, including whitespace.
 * @param value - Value to inspect.
 * @returns Whether the value is a non-empty string.
 */
export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.length > 0;
}

/** Returns true for strings containing at least one non-whitespace character.
 * @param value - Value to inspect.
 * @returns Whether the value is a non-blank string.
 */
export function isNonBlankString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

/** Returns true when a value has the JavaScript number type, including `NaN` and infinities.
 * @param value - Value to inspect.
 * @returns Whether the value is a number.
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

/** Returns true for numbers that are neither `NaN` nor positive or negative infinity.
 * @param value - Value to inspect.
 * @returns Whether the value is finite.
 */
export function isFiniteNumber(value: unknown): value is number {
  return isNumber(value) && Number.isFinite(value);
}

/** Returns true for numbers without a fractional part, including `NaN`-safe integer checks.
 * @param value - Value to inspect.
 * @returns Whether the value is an integer.
 */
export function isInteger(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value);
}

/** Returns true when a value has the JavaScript boolean type.
 * @param value - Value to inspect.
 * @returns Whether the value is a boolean.
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/** Returns true when a record has one or more own enumerable string keys.
 * @param value - Record to inspect.
 * @returns Whether the record has own enumerable keys.
 */
export function hasKeys(value: Record<string, unknown>): boolean {
  return Object.keys(value).length > 0;
}

/** Returns true when an object has an own property with the supplied key.
 * @param value - Object to inspect.
 * @param key - Property key to find.
 * @returns Whether the object owns the key.
 */
export function hasKey<Key extends PropertyKey>(
  value: object,
  key: Key
): value is object & Record<Key, unknown> {
  return Object.hasOwn(value, key);
}
