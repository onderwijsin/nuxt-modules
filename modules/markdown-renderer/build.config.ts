import { copyFile, mkdir, readdir } from "node:fs/promises";

import { dirname, resolve } from "pathe";
import { defineBuildConfig } from "unbuild";

const rendererDirectory = "runtime/app/components/renderer";
const metadataSupportSources = [
  "runtime/app/utils/define-editor-component-schema.ts",
  "schema/editor-component-schema.ts"
];

/**
 * Emits the shared schema contract alongside the compiled runtime code. After the build, the hook
 * discovers every direct Vue component in the built-in renderer directory and copies its original
 * source into `dist/metadata`, together with the macro helper and schema types those sources use.
 * Keeping the source paths under `metadata` lets nuxt-component-meta parse the TypeScript, JSDoc,
 * slots, and macro calls that compilation removes. Nuxt still registers the compiled components
 * from `dist/runtime`; these copied files are only inputs for build-time metadata extraction.
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
  ],
  hooks: {
    async "build:done"(context) {
      const rendererSources = (
        await readdir(resolve(import.meta.dirname, "src", rendererDirectory), {
          withFileTypes: true
        })
      )
        .filter((entry) => entry.isFile() && entry.name.endsWith(".vue"))
        .map((entry) => `${rendererDirectory}/${entry.name}`)
        .sort();

      for (const source of [...rendererSources, ...metadataSupportSources]) {
        const destination = resolve(context.options.outDir, "metadata", source);
        await mkdir(dirname(destination), { recursive: true });
        await copyFile(resolve(import.meta.dirname, "src", source), destination);
      }
    }
  }
});
