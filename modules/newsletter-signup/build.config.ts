import { defineBuildConfig } from "unbuild";
import { inlineModuleUtilsRuntime } from "../../scripts/inline-module-utils-runtime.mjs";

export default defineBuildConfig({
  rollup: { inlineDependencies: ["module-utils"] },
  hooks: {
    "mkdist:done": (context) =>
      inlineModuleUtilsRuntime(context.options.rootDir, `${context.options.outDir}/runtime`)
  }
});
