import { addComponent, createResolver, defineNuxtModule } from "@nuxt/kit";
import { resolveModuleName, transpileRuntime } from "@onderwijsin/nuxt-module-utils/build";
import { version } from "../package.json";

/** Registers the client-only Tailwind breakpoint badge. */
export default defineNuxtModule({
  meta: {
    name: resolveModuleName("tailwindBreakpoint"),
    configKey: "tailwindBreakpoint",
    version,
    compatibility: { nuxt: "^4.0.0" }
  },
  moduleDependencies: { "@nuxt/ui": { version: "^4.0.0" } },
  setup(_options, nuxt) {
    const resolver = createResolver(import.meta.url);
    const runtimeDir = resolver.resolve("./runtime");
    transpileRuntime(nuxt, runtimeDir);
    addComponent({
      name: "TailwindBreakpoint",
      filePath: resolver.resolve(runtimeDir, "app/components/TailwindBreakpoint.client.vue"),
      mode: "client"
    });
  }
});
