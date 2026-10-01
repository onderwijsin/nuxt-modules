import { defineBuildConfig } from "unbuild";

/**
 * Nuxt module builder emits src/runtime and bundles src/module, but does not copy sibling src/schema.
 * Emit that shared contract once so both the module bundle and published runtime imports resolve.
 */
export default defineBuildConfig({
  externals: [/dist[\\/]schema[\\/]/],
  entries: [
    {
      input: "src/schema/",
      outDir: "dist/schema",
      ext: "js",
      addRelativeDeclarationExtensions: true
    }
  ]
});
