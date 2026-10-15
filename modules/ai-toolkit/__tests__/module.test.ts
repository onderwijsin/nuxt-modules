import { describe, expect, it } from "vitest";
import aiToolkit from "../src/module";
import { name, version } from "../package.json";

describe("AI Toolkit module registration", () => {
  it("identifies the package and consumer configuration key", async () => {
    expect(await aiToolkit.getMeta?.()).toMatchObject({
      name,
      version,
      configKey: "aiToolkit"
    });
  });

  it("declares Nuxt 4 compatibility", async () => {
    expect((await aiToolkit.getMeta?.())?.compatibility).toEqual({ nuxt: "^4.0.0" });
  });
});
