import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/types.ts"],
  format: ["esm"],
  dts: {
    resolve: true
  },
  clean: true,
  sourcemap: true,
  bundle: true,
  noExternal: ["scule"],
  external: ["@nuxt/schema", "consola"]
});
