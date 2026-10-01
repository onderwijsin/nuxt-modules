import { describe, expect, it } from "vitest";

import { createEditorComponentMetadata } from "../src/runtime/server/utils/metadata";

describe("Markdown editor component metadata", () => {
  it("accepts an image input for an optional string prop", () => {
    const result = createEditorComponentMetadata(
      {
        Hero: {
          meta: {
            markdownRenderer: {
              props: { image: { tags: [{ name: "editor", text: "image" }] } }
            },
            props: [{ name: "image", type: "string | undefined", schema: "string" }]
          }
        }
      },
      [{ name: "Hero", componentName: "Hero" }]
    );

    expect(result[0]?.props.image).toMatchObject({
      type: "string",
      tags: [{ name: "editor", text: "image" }]
    });
  });

  it("preserves required icon collections in the endpoint output", () => {
    const result = createEditorComponentMetadata(
      {
        Hero: {
          meta: {
            markdownRenderer: {
              props: {
                icon: {
                  tags: [{ name: "editor", text: "icon", config: { collections: ["lucide"] } }]
                }
              }
            },
            props: [{ name: "icon", type: "string", schema: "string" }]
          }
        }
      },
      [{ name: "Hero", componentName: "Hero" }]
    );

    expect(result[0]?.props.icon?.tags).toEqual([
      { name: "editor", text: "icon", config: { collections: ["lucide"] } }
    ]);
  });

  it("rejects an image input for a number prop even when its editor type is overridden", () => {
    expect(() =>
      createEditorComponentMetadata(
        {
          Hero: {
            meta: {
              markdownRenderer: {
                props: { image: { type: "string", tags: [{ name: "editor", text: "image" }] } }
              },
              props: [{ name: "image", type: "number", schema: "number" }]
            }
          }
        },
        [{ name: "Hero", componentName: "Hero" }]
      )
    ).toThrow(
      'Invalid editor input "image" for Hero.props.image: inferred property type is "number".'
    );
  });

  it("rejects an incompatible input on a nested array item property", () => {
    expect(() =>
      createEditorComponentMetadata(
        {
          Hero: {
            meta: {
              markdownRenderer: {
                props: {
                  actions: {
                    items: { properties: { to: { tags: [{ name: "editor", text: "url" }] } } }
                  }
                }
              },
              props: [
                {
                  name: "actions",
                  type: "Action[]",
                  schema: {
                    kind: "array",
                    schema: [
                      {
                        kind: "object",
                        schema: { to: { name: "to", type: "number", schema: "number" } }
                      }
                    ]
                  }
                }
              ]
            }
          }
        },
        [{ name: "Hero", componentName: "Hero" }]
      )
    ).toThrow("Hero.props.actions.items.properties.to");
  });

  it("preserves nested objects, array items, descriptions, and literal choices", () => {
    const result = createEditorComponentMetadata(
      {
        Hero: {
          meta: {
            markdownRenderer: {
              props: {
                image: { properties: { src: { tags: [{ name: "editor", text: "image" }] } } },
                actions: {
                  items: {
                    properties: { to: { tags: [{ name: "editor", text: "url" }] } }
                  }
                }
              }
            },
            props: [
              {
                name: "image",
                type: "{ src: string; alt?: string }",
                schema: {
                  kind: "enum",
                  schema: {
                    0: "undefined",
                    1: {
                      kind: "object",
                      schema: {
                        src: {
                          name: "src",
                          type: "string",
                          required: true,
                          description: "Image source."
                        },
                        alt: { name: "alt", type: "string", required: false }
                      }
                    }
                  }
                }
              },
              {
                name: "actions",
                type: "Action[]",
                schema: {
                  kind: "enum",
                  schema: {
                    0: "undefined",
                    1: {
                      kind: "array",
                      schema: [
                        {
                          kind: "object",
                          type: "Action",
                          schema: {
                            to: { name: "to", type: "string", required: true },
                            tone: {
                              name: "tone",
                              type: "'primary' | 'neutral'",
                              schema: {
                                kind: "enum",
                                schema: { 0: "'primary'", 1: "'neutral'", 2: "undefined" }
                              }
                            }
                          }
                        }
                      ]
                    }
                  }
                }
              }
            ]
          }
        }
      },
      [{ name: "Hero", componentName: "Hero" }]
    );

    expect(result[0]?.props.image).toMatchObject({
      type: "object",
      properties: {
        src: {
          type: "string",
          required: true,
          description: "Image source.",
          tags: [{ name: "editor", text: "image" }]
        },
        alt: { type: "string" }
      }
    });
    expect(result[0]?.props.actions).toMatchObject({
      type: "array",
      items: {
        type: "object",
        properties: {
          to: { required: true, tags: [{ name: "editor", text: "url" }] },
          tone: { values: ["primary", "neutral"] }
        }
      }
    });
  });

  it("maps props and slots and omits the reserved Reference node", () => {
    const result = createEditorComponentMetadata(
      {
        MarkdownCallout: {
          meta: {
            description: "Supporting content.",
            markdownRenderer: {
              label: "Notice",
              nodeType: "inline",
              tags: [{ name: "deprecated", text: "Use Banner instead." }],
              props: {
                tone: {
                  values: ["neutral", "critical"],
                  tags: [{ name: "editor", text: "appearance" }]
                }
              }
            },
            props: [
              {
                name: "tone",
                type: "ImportedColor | number",
                description: "Visual tone.",
                required: true,
                default: "'info'",
                tags: [{ name: "editor", text: "style" }],
                schema: {
                  kind: "enum",
                  schema: [
                    { kind: "literal", value: "info" },
                    { kind: "literal", value: "warning" }
                  ]
                }
              }
            ],
            slots: [{ name: "default" }]
          }
        },
        MarkdownReference: { meta: { props: [], slots: [] } }
      },
      [
        { name: "MarkdownCallout", componentName: "MarkdownCallout" },
        { name: "Reference", componentName: "MarkdownReference" }
      ]
    );

    expect(result).toEqual([
      {
        name: "MarkdownCallout",
        label: "Notice",
        description: "Supporting content.",
        nodeType: "inline",
        props: {
          tone: {
            name: "tone",
            type: "string",
            description: "Visual tone.",
            required: true,
            default: "info",
            values: ["neutral", "critical"],
            tags: [{ name: "editor", text: "appearance" }]
          }
        },
        slots: ["default"],
        tags: [{ name: "deprecated", text: "Use Banner instead." }]
      }
    ]);
  });
});
