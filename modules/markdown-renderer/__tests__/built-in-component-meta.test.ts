import { dirname, resolve } from "pathe";
import type { ComponentMetaParserOptions } from "nuxt-component-meta";
import { getComponentMeta } from "nuxt-component-meta/parser";
import { describe, expect, it } from "vitest";

import { useBuiltInComponentSources } from "../src/config/built-in-component-meta";
import { transformMarkdownComponentMeta } from "../src/config/component-meta";
import { createEditorComponentMetadata } from "../src/runtime/server/utils/metadata";

const source = resolve(import.meta.dirname, "fixtures/component-meta/MarkdownExample.vue");
const compiled = resolve(import.meta.dirname, "fixtures/compiled/MarkdownExample.vue");

describe("built-in component metadata", () => {
  it("infers props, defaults, slots, and macro tags from the packaged typed source", () => {
    const options: ComponentMetaParserOptions = {
      components: [
        {
          pascalName: "MarkdownExample",
          kebabName: "markdown-example",
          export: "default",
          filePath: compiled,
          shortPath: compiled,
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
    useBuiltInComponentSources(options, dirname(compiled), dirname(source));

    const metadataSource = options.components[0]?.filePath;
    expect(metadataSource).toBe(source);
    if (!metadataSource) throw new Error("Missing metadata source path.");
    const meta = getComponentMeta(metadataSource, {
      rootDir: resolve(import.meta.dirname, ".."),
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
      nodeType: "block",
      slots: ["description"],
      props: {
        tone: { description: "Example tone.", default: "primary" },
        actions: {
          description: "Optional actions.",
          items: {
            properties: {
              label: { description: "Action label.", required: true },
              to: {
                description: "Action destination.",
                tags: [{ name: "specialInputType", text: "url" }]
              },
              icon: {
                description: "Action icon.",
                tags: [
                  { name: "specialInputType", text: "icon", config: { collections: ["lucide"] } },
                  { name: "deprecated" }
                ]
              }
            }
          }
        }
      }
    });
  });
});
