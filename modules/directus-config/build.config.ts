import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  clean: true,
  declaration: "compatible",
  entries: [
    { input: "src/config/index", outDir: "dist/config" },
    { input: "src/schema/index", outDir: "dist/schema" }
  ],
  rollup: { emitCJS: false }
});
