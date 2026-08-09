import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const moduleRoot = fileURLToPath(new URL("../", import.meta.url));

describe("packed package", () => {
  it("includes the public Nuxt module and runtime export consumed by the e2e fixture", () => {
    const outputDirectory = mkdtempSync(join(tmpdir(), "nuxt-cache-pack-"));

    try {
      execFileSync("corepack", ["pnpm", "pack", "--pack-destination", outputDirectory], {
        cwd: moduleRoot,
        stdio: "pipe"
      });
      const [tarball] = readdirSync(outputDirectory).filter((file) => file.endsWith(".tgz"));
      expect(tarball).toBeDefined();

      const packedFiles = execFileSync("tar", ["-tzf", join(outputDirectory, tarball)], {
        encoding: "utf8"
      });
      expect(packedFiles).toContain("package/dist/module.mjs");
      expect(packedFiles).toContain("package/dist/runtime/index.js");
      expect(packedFiles).toContain("package/dist/runtime/index.d.ts");
    } finally {
      rmSync(outputDirectory, { force: true, recursive: true });
    }
  });
});
