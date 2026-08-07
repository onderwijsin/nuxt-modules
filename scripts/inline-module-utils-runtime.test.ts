import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { inlineModuleUtilsRuntime } from "./inline-module-utils-runtime.mjs";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true }))
  );
});

describe("inlineModuleUtilsRuntime", () => {
  it("copies utilities into runtime output and rewrites private imports", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "inline-module-utils-"));
    temporaryDirectories.push(workspaceRoot);
    const moduleRoot = join(workspaceRoot, "modules", "example");
    const runtimeDirectory = join(moduleRoot, "dist", "runtime");

    await mkdir(join(workspaceRoot, "packages", "module-utils", "dist", "shared"), {
      recursive: true
    });
    await mkdir(join(runtimeDirectory, "app"), { recursive: true });
    await writeFile(
      join(workspaceRoot, "packages", "module-utils", "dist", "shared", "index.js"),
      "export const attempt = () => undefined;"
    );
    await writeFile(
      join(runtimeDirectory, "app", "composable.js"),
      'import { attempt } from "module-utils/shared";\nvoid attempt;'
    );

    await inlineModuleUtilsRuntime(moduleRoot, runtimeDirectory);

    await expect(
      readFile(join(runtimeDirectory, "app", "composable.js"), "utf8")
    ).resolves.toContain('from "../module-utils/shared/index.js"');
    await expect(
      readFile(join(runtimeDirectory, "module-utils", "shared", "index.js"), "utf8")
    ).resolves.toContain("export const attempt");
  });
});
