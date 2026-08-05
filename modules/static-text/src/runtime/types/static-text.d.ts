import type content from "../static-text-content";
import type { TextTranslator } from "@onderwijsin/nuxt-static-text";

declare module "#app" {
  interface NuxtApp {
    $t: TextTranslator<typeof content>;
  }
}

declare module "vue" {
  interface ComponentCustomProperties {
    $t: TextTranslator<typeof content>;
  }
}

export {};
