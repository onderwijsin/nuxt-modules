import content from "#build/static-text-content";
import { defineNuxtPlugin } from "nuxt/app";

import { createTextTranslator } from "../../translator";

/**
 * Exposes the typed text translator as `$t` in Vue templates.
 * @returns A Nuxt plugin that provides the `$t` translator.
 */
export default defineNuxtPlugin(() => ({
  provide: {
    t: createTextTranslator(content)
  }
}));
