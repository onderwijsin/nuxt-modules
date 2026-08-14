import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(new URL("../package.json", import.meta.url));

describe("package exports", () => {
  it("resolves build utilities through CommonJS-compatible resolution", () => {
    expect(require.resolve("@onderwijsin/nuxt-module-utils/build")).toMatch(
      /dist[\\/]build[\\/]index\.js$/u
    );
  });
});
