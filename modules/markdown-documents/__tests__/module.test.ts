import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { loadNuxt, useNitro } from "@nuxt/kit";
import { afterEach, describe, expect, it, vi } from "vitest";
import markdownDocuments from "../src/module";
import type { ModuleOptions } from "../src/types/options";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** Creates an application root without depending on playground settings.
 * @returns The temporary application root.
 */
function rootDirectory() {
  const root = mkdtempSync(join(tmpdir(), "markdown-definition-setup-"));
  roots.push(root);
  return root;
}

/** Loads the actual module through Nuxt's normal inline option merge.
 * @param root Application root.
 * @param options Consumer module options.
 * @param dev Whether to enable development watching.
 * @param configOptions Options supplied through the public configuration key.
 * @returns The initialized Nuxt instance.
 */
async function loadModule(
  root: string,
  options: ModuleOptions,
  dev = false,
  configOptions?: ModuleOptions
) {
  return loadNuxt({
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    dev,
    overrides: {
      rootDir: root,
      markdownDocuments: configOptions,
      serverDir: join(root, "backend"),
      modules: [[markdownDocuments, options]],
      dev,
      devtools: { enabled: false },
      compatibilityDate: "2026-08-07",
      telemetry: false
    },
    ready: true
  });
}

describe("markdown document Nuxt setup", () => {
  it.each([undefined, null])(
    "leaves inline prefix %s unset and registers only server imports",
    async (rawPrefix) => {
      const nuxt = await loadModule(rootDirectory(), { rawPrefix });
      try {
        const registry = "#markdown-documents";
        const template = nuxt.options.nitro.virtual?.[registry];
        expect(template).toBeTypeOf("function");
        if (typeof template !== "function") throw new Error("Missing registry template");
        expect(await template()).not.toContain('"rawPrefix"');
        const nitro = nuxt.runWithContext(() => useNitro());
        expect(nitro.options.imports && nitro.options.imports.imports).toEqual(
          expect.arrayContaining([expect.objectContaining({ name: "defineMarkdownDocument" })])
        );
        expect(nuxt.options.imports.imports).not.toEqual(
          expect.arrayContaining([expect.objectContaining({ name: "defineMarkdownDocument" })])
        );
      } finally {
        await nuxt.close();
      }
    }
  );

  it("uses no prefix when the public configuration key sets null", async () => {
    const nuxt = await loadModule(rootDirectory(), {}, false, { rawPrefix: null });
    try {
      const template = nuxt.options.nitro.virtual?.["#markdown-documents"];
      if (typeof template !== "function") throw new Error("Missing registry template");
      expect(await template()).not.toContain('"rawPrefix"');
    } finally {
      await nuxt.close();
    }
  });

  it("keeps an explicitly configured /raw prefix", async () => {
    const nuxt = await loadModule(rootDirectory(), { rawPrefix: "/raw" });
    try {
      const template = nuxt.options.nitro.virtual?.["#markdown-documents"];
      if (typeof template !== "function") throw new Error("Missing registry template");
      expect(await template()).toContain('"rawPrefix":"/raw"');
    } finally {
      await nuxt.close();
    }
  });

  it("captures explicit pages and Nitro handlers for runtime collision validation", async () => {
    const nuxt = await loadModule(rootDirectory(), {});
    try {
      const nitro = nuxt.runWithContext(() => useNitro());
      if (!nitro) throw new Error("Nitro was not initialized");
      nitro.options.handlers.push({ route: "/articles/one.md", handler: "/server/article.ts" });
      await nuxt.callHook("pages:extend", [
        { path: "/articles/:slug().md", file: "/app/page.vue" }
      ]);
      const template = nuxt.options.nitro.virtual?.["#markdown-documents-http"];
      if (typeof template !== "function") throw new Error("Missing HTTP template");
      const generated = await template();
      expect(generated).toContain("/articles/one.md");
      expect(generated).toContain("/app/page.vue");
      expect(nitro.options.handlers).toContainEqual(
        expect.objectContaining({ middleware: true, handler: "#markdown-documents-http" })
      );
    } finally {
      await nuxt.close();
    }
  });

  it("skips registration and missing-directory checks when disabled", async () => {
    const nuxt = await loadModule(rootDirectory(), { enabled: false, dir: "absent" });
    try {
      expect(Object.keys(nuxt.options.nitro.virtual ?? {})).not.toEqual(
        expect.arrayContaining([expect.stringContaining("#markdown-documents")])
      );
    } finally {
      await nuxt.close();
    }
  });

  it("uses rootDir despite a custom serverDir and reloads membership without duplicating plugins", async () => {
    const root = rootDirectory();
    mkdirSync(join(root, "custom-documents"));
    const nuxt = await loadModule(root, { dir: "custom-documents" }, true);
    try {
      const nitro = nuxt.runWithContext(() => useNitro());
      if (!nitro) throw new Error("Nitro was not initialized");
      const reload = vi.fn();
      nitro.hooks.hook("rollup:reload", reload);
      const count = nuxt.options.nitro.plugins?.length;
      await nuxt.callHook("builder:watch", "add", join(root, "custom-documents/new.ts"));
      await nuxt.callHook("builder:watch", "unlink", join(root, "custom-documents/new.ts"));
      await nuxt.callHook("builder:watch", "change", join(root, "custom-documents/new.ts"));
      await nuxt.callHook("builder:watch", "add", join(root, "other.ts"));
      expect(reload).toHaveBeenCalledTimes(2);
      expect(nuxt.options.nitro.plugins).toHaveLength(count ?? 0);
    } finally {
      await nuxt.close();
    }
  });
});
