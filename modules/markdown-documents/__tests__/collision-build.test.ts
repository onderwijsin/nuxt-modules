import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { buildNuxt, loadNuxt } from "@nuxt/kit";
import { attempt, isRecord, isString } from "@onderwijsin/nuxt-module-utils/shared";
import { describe, expect, it } from "vitest";
import { resolveFixture } from "../../../packages/test-utils/src";
import markdownDocuments from "../src/module";

const execute = promisify(execFile);

describe("compiled raw route collision diagnostics", () => {
  for (const rawPrefix of [null, "/raw"]) {
    it.each(["handler", "page"])(
      `rejects a conflicting %s at startup with rawPrefix ${rawPrefix}`,
      async (kind) => {
        const fixture = resolveFixture(import.meta.url);
        const builds = join(fixture, ".nuxt");
        await mkdir(builds, { recursive: true });
        const directory = await mkdtemp(join(builds, "collision-"));
        const route = `${rawPrefix ?? ""}/articles/first.md`;
        const source =
          kind === "handler"
            ? join(fixture, "server/routes/neighbor.md.get.ts")
            : join(fixture, "app/pages/articles/first.vue");
        const nuxt = await loadNuxt({
          cwd: fileURLToPath(new URL("..", import.meta.url)),
          dev: false,
          overrides: {
            rootDir: fixture,
            buildDir: join(directory, "build"),
            modules: [markdownDocuments],
            markdownDocuments: { rawPrefix },
            nitro: {
              output: { dir: join(directory, "output") },
              handlers: kind === "handler" ? [{ route, handler: source }] : []
            },
            hooks: {
              "pages:extend": (pages) => {
                if (kind === "page")
                  pages.push({ path: route, name: "raw-conflict", file: source });
              }
            },
            telemetry: false,
            devtools: { enabled: false },
            logLevel: "silent"
          }
        });
        try {
          await buildNuxt(nuxt);
          const result = await attempt(() =>
            execute(process.execPath, [join(directory, "output/server/index.mjs")], {
              timeout: 10_000,
              env: { ...process.env, PORT: "0", HOST: "127.0.0.1" }
            })
          );
          expect(result.error).not.toBeNull();
          if (!isRecord(result.error) || !isString(result.error.stderr)) {
            throw new Error("Expected compiled Nitro startup diagnostics");
          }
          expect(result.error.stderr).toContain("conflicts with");
          expect(result.error.stderr).toContain("articles.ts");
          expect(result.error.stderr).toContain(source);
          expect(result.error.stderr).toContain(route);
        } finally {
          await nuxt.close();
          await rm(directory, { recursive: true, force: true });
        }
      },
      60_000
    );
  }
});
