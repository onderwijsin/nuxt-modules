import type { TextDictionary, TextTranslator } from "../types/dictionary";

type RuntimeParameters = Record<string, string | number>;

/**
 * Creates a text translator for a static dictionary.
 *
 * @param dictionary - Nested dictionary containing text leaves.
 * @returns A typed translator that resolves dotted paths and named placeholders.
 */
export function createTextTranslator<Dictionary extends TextDictionary>(
  dictionary: Dictionary
): TextTranslator<Dictionary> {
  return ((key: string, parameters?: RuntimeParameters): string => {
    const message = key.split(".").reduce<unknown>((value, segment) => {
      if (!value || typeof value !== "object") return undefined;
      return (value as Record<string, unknown>)[segment];
    }, dictionary);

    if (typeof message !== "string") {
      throw new Error(`Unknown text key: ${key}`);
    }

    return message.replace(/\{([^{}]+)\}/g, (placeholder, name: string) => {
      const value = parameters?.[name];
      return value === undefined ? placeholder : String(value);
    });
  }) as TextTranslator<Dictionary>;
}
