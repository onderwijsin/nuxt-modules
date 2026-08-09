import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { packPackage, type PackedPackage } from "./helpers/pack-package";

const moduleRoot = fileURLToPath(new URL("../", import.meta.url));
let packedPackage: PackedPackage | undefined;

afterEach(() => {
  packedPackage?.cleanup();
  packedPackage = undefined;
});

describe("packed package", () => {
  it("includes the public Nuxt module and runtime export consumed by the e2e fixture", () => {
    packedPackage = packPackage(moduleRoot);
    const packedFiles = execFileSync("tar", ["-tzf", packedPackage.tarballPath], {
      encoding: "utf8"
    });

    expect(packedFiles).toContain("package/dist/module.mjs");
    expect(packedFiles).toContain("package/dist/runtime/index.js");
    expect(packedFiles).toContain("package/dist/runtime/index.d.ts");
  });
});
