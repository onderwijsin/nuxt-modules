import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/build/index.ts",
    "src/app/index.ts",
    "src/server/index.ts",
    "src/shared/index.ts",
    "src/types.ts"
  ],
  format: ["esm"],
  dts: {
    resolver: "tsc",
    eager: true
  },
  clean: true,
  sourcemap: true,
  deps: {
    alwaysBundle: ["scule"]
  }
});
