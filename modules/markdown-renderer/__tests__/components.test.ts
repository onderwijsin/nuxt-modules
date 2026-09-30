import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  discoverRendererComponents,
  generateReferenceResolver,
  generateRendererManifest,
  mergeRendererComponents
} from "../src/config/components";

describe("renderer component registry", () => {
  it("discovers only direct Vue files in deterministic order", () => {
    const directory = mkdtempSync(join(tmpdir(), "markdown-renderer-"));
    mkdirSync(join(directory, "nested"));
    writeFileSync(join(directory, "Video.vue"), "<template />");
    writeFileSync(join(directory, "Hero.vue"), "<template />");
    writeFileSync(join(directory, "notes.txt"), "ignored");
    writeFileSync(join(directory, "nested", "Nested.vue"), "<template />");

    expect(discoverRendererComponents(directory).map(({ name }) => name)).toEqual([
      "Hero",
      "Video"
    ]);
  });

  it("lets consumer components replace built-ins by name", () => {
    expect(
      mergeRendererComponents(
        [{ name: "Callout", filePath: "/built-in/Callout.vue" }],
        [{ name: "Callout", filePath: "/consumer/Callout.vue" }]
      )
    ).toEqual([{ name: "Callout", filePath: "/consumer/Callout.vue" }]);
  });

  it("generates lazy imports and component-set constraints", () => {
    const source = generateRendererManifest(
      [{ name: "Callout", filePath: "/components/Callout.vue" }],
      { article: ["Callout"] }
    );

    expect(source).toContain('"Callout": () => import("/components/Callout.vue")');
    expect(source).toContain('const componentSets = {"article":["Callout"]};');
    expect(source).toContain("allowedComponents.includes(normalizedName)");
  });

  it("generates an optional reference resolver bridge", () => {
    expect(generateReferenceResolver()).toBe(
      "export default function resolveReferencePath(_collection: string, _item: string, _label?: string, _text?: string, _data?: Record<string, unknown>): string | undefined { return undefined; }"
    );
    expect(generateReferenceResolver("~/utils/reference")).toBe(
      'export { default } from "~/utils/reference";'
    );
  });
});
