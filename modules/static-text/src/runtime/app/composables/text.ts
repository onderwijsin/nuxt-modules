import content from "#build/static-text-content";
import type { TextTranslator } from "@onderwijsin/nuxt-static-text";

import { createTextTranslator } from "../../translator";

/** Typed text lookup auto-imported by the text module. */
export const useText: TextTranslator<typeof content> = createTextTranslator(content);
