import { dirname, resolve } from "pathe";
import type { ComponentMetaParserOptions } from "nuxt-component-meta";
import { getComponentMeta } from "nuxt-component-meta/parser";
import { describe, expect, it } from "vitest";

import { useBuiltInComponentDeclarations } from "../src/config/built-in-component-meta";
import { transformMarkdownComponentMeta } from "../src/config/component-meta";
import { createEditorComponentMetadata } from "../src/runtime/server/utils/metadata";

const source = resolve(import.meta.dirname, "fixtures/component-meta/MarkdownExample.vue");

describe("built-in component metadata", () => {
  it("infers props from the declaration and extracts the macro from the built Vue file", () => {
    const options: ComponentMetaParserOptions = {
      components: [
        {
          pascalName: "MarkdownExample",
          kebabName: "markdown-example",
          export: "default",
          filePath: source,
          shortPath: source,
          chunkName: "markdown-example",
          prefetch: false,
          preload: false
        }
      ],
      componentDirs: [],
      overrides: {},
      metaFields: { type: true, props: true, slots: true, events: true, exposed: true },
      transformers: []
    };
    useBuiltInComponentDeclarations(options, dirname(source));

    const declaration = options.components[0]?.filePath;
    expect(declaration).toBe(source.replace(/\.vue$/, ".vue.d.ts"));
    if (!declaration) throw new Error("Missing metadata declaration path.");
    const meta = getComponentMeta(declaration, {
      rootDir: resolve(import.meta.dirname, ".."),
      transformers: options.transformers,
      extendMetaFunctions: [
        { name: "defineEditorComponentSchema", transform: transformMarkdownComponentMeta }
      ]
    });

    expect(meta.props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "actions",
          description: "Optional actions.",
          schema: expect.objectContaining({ kind: "enum" })
        })
      ])
    );
    const output = createEditorComponentMetadata({ MarkdownExample: { meta } }, [
      { name: "MarkdownExample", componentName: "MarkdownExample" }
    ]);
    expect(output[0]).toMatchObject({
      label: "Example",
      props: {
        actions: {
          description: "Optional actions.",
          items: {
            properties: {
              label: { description: "Action label.", required: true },
              to: {
                description: "Action destination.",
                tags: [{ name: "specialInputType", text: "url" }]
              }
            }
          }
        }
      }
    });
  });
});
