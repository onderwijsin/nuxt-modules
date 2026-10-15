import { defineNuxtModule } from "@nuxt/kit";
import { name, version } from "../package.json";

/** Registers the AI Toolkit scaffold; runtime features are planned in IMPLEMENTATION.md. */
export default defineNuxtModule({
  meta: {
    name,
    version,
    configKey: "aiToolkit",
    compatibility: { nuxt: "^4.0.0" }
  },
  setup() {
    // Intentionally inert until the integration gates in IMPLEMENTATION.md are resolved.
  }
});
