/**
 * Returns an object's own enumerable string-keyed entries with typed keys and values.
 * @param value - Object whose entries should be returned.
 * @returns Typed key/value pairs from the object.
 */
export function toEntries<T extends object>(value: T): [keyof T, T[keyof T]][] {
  return Object.entries(value) as [keyof T, T[keyof T]][];
}

/**
 * Creates an object from typed key/value entries.
 * @param entries - Key/value pairs to combine into an object.
 * @returns An object indexed by the entry keys and containing their values.
 */
export function fromEntries<K extends PropertyKey, V>(
  entries: Iterable<readonly [K, V]>
): Record<K, V> {
  return Object.fromEntries(entries) as Record<K, V>;
}
