import { isDefined, isRecord, isString } from "@onderwijsin/nuxt-module-utils/shared";
import type { TextDictionary, TextTranslator } from "@onderwijsin/nuxt-static-text";

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
      if (!isRecord(value)) return undefined;
      return value[segment];
    }, dictionary);

    if (!isString(message)) {
      throw new Error(`Unknown text key: ${key}`);
    }

    return message.replace(/\{([^{}]+)\}/g, (placeholder, name: string) => {
      const value = parameters?.[name];
      return !isDefined(value) ? placeholder : String(value);
    });
  }) as TextTranslator<Dictionary>;
}
