import { describe, expect, it } from "vitest";

import {
  generateRendererManifest,
  mergeRendererComponents,
  selectRendererComponents
} from "../src/config/components";

describe("renderer component registry", () => {
  it("selects only direct renderer children from Nuxt's component registry", () => {
    expect(
      selectRendererComponents(
        [
          { pascalName: "Video", filePath: "/project/app/components/renderer/Video.vue" },
          {
            pascalName: "RendererMarkdownHero",
            filePath: "/project/app/components/renderer/MarkdownHero.vue"
          },
          {
            pascalName: "MarkdownReference",
            filePath: "/project/app/components/renderer/MarkdownReference.vue"
          },
          {
            pascalName: "Nested",
            filePath: "/project/app/components/renderer/nested/Nested.vue"
          },
          { pascalName: "Unrelated", filePath: "/project/app/components/Unrelated.vue" }
        ],
        ["/project/app/components/renderer"]
      )
    ).toEqual([
      {
        name: "MarkdownHero",
        componentName: "RendererMarkdownHero",
        filePath: "/project/app/components/renderer/MarkdownHero.vue"
      },
      {
        name: "Reference",
        componentName: "MarkdownReference",
        filePath: "/project/app/components/renderer/MarkdownReference.vue"
      },
      {
        name: "Video",
        componentName: "Video",
        filePath: "/project/app/components/renderer/Video.vue"
      }
    ]);
  });

  it("lets consumer components replace built-ins by name", () => {
    expect(
      mergeRendererComponents(
        [
          {
            name: "MarkdownCallout",
            componentName: "MarkdownCallout",
            filePath: "/built-in/MarkdownCallout.vue"
          }
        ],
        [
          {
            name: "MarkdownCallout",
            componentName: "MarkdownCallout",
            filePath: "/consumer/MarkdownCallout.vue"
          }
        ]
      )
    ).toEqual([
      {
        name: "MarkdownCallout",
        componentName: "MarkdownCallout",
        filePath: "/consumer/MarkdownCallout.vue"
      }
    ]);
  });

  it("generates lazy imports and component-set constraints", () => {
    const source = generateRendererManifest(
      [
        {
          name: "MarkdownCallout",
          componentName: "MarkdownCallout",
          filePath: "/components/MarkdownCallout.vue"
        },
        {
          name: "Reference",
          componentName: "MarkdownReference",
          filePath: "/components/MarkdownReference.vue"
        }
      ],
      { article: ["MarkdownCallout"] }
    );

    expect(source).toContain('"MarkdownCallout": () => import("/components/MarkdownCallout.vue")');
    expect(source).toContain('"Reference": () => import("/components/MarkdownReference.vue")');
    expect(source).toContain(
      'createRendererManifest(componentLoaders, {"article":["MarkdownCallout"]})'
    );
    expect(source).not.toContain("function resolveRendererComponent");
  });
});
