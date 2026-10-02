import { describe, expect, it } from "vitest";

import {
  EditorComponentInputSchema,
  EditorComponentResponseSchema,
  specialInputs
} from "../src/schema/editor-component-schema";

describe("editor component contract", () => {
  it("accepts top-level properties and rejects the former macro key", () => {
    expect(
      EditorComponentInputSchema.safeParse({
        label: "Hero",
        type: "block",
        properties: { title: { type: "string" } }
      }).success
    ).toBe(true);
    expect(
      EditorComponentInputSchema.safeParse({
        label: "Hero",
        type: "block",
        props: { title: { type: "string" } }
      }).success
    ).toBe(false);
  });

  it("defines image as a control for string properties", () => {
    expect(specialInputs.safeParse({ inputType: "image", propertyType: "string" }).success).toBe(
      true
    );
    expect(specialInputs.safeParse({ inputType: "image", propertyType: "number" }).success).toBe(
      false
    );
    expect(
      EditorComponentInputSchema.safeParse({
        label: "Hero",
        type: "block",
        properties: { image: { input: { type: "image" } }, url: { input: { type: "url" } } }
      }).success
    ).toBe(true);
  });

  it("requires icon collections in macro input and endpoint metadata", () => {
    expect(
      EditorComponentInputSchema.safeParse({
        label: "Hero",
        type: "block",
        properties: { icon: { input: { type: "icon", collections: ["lucide"] } } }
      }).success
    ).toBe(true);
    expect(
      EditorComponentInputSchema.safeParse({
        label: "Hero",
        type: "block",
        properties: { icon: { input: { type: "icon", collections: [] } } }
      }).success
    ).toBe(false);
    expect(
      EditorComponentInputSchema.safeParse({
        label: "Hero",
        type: "block",
        properties: { icon: { input: "icon" } }
      }).success
    ).toBe(false);
    expect(
      specialInputs.safeParse({
        inputType: "icon",
        propertyType: "string",
        config: { collections: ["lucide"] }
      }).success
    ).toBe(true);
    expect(specialInputs.safeParse({ inputType: "icon", propertyType: "string" }).success).toBe(
      false
    );
    expect(
      EditorComponentResponseSchema.safeParse([
        {
          name: "Hero",
          label: "Hero",
          nodeType: "block",
          slots: [],
          props: {
            icon: {
              name: "icon",
              type: "string",
              tags: [{ name: "specialInputType", text: "icon" }]
            }
          }
        }
      ]).success
    ).toBe(false);
  });

  it("rejects unsupported controls at any nesting depth", () => {
    expect(
      EditorComponentInputSchema.safeParse({
        label: "Hero",
        type: "block",
        properties: { actions: { items: { properties: { to: { input: "unsupported" } } } } }
      }).success
    ).toBe(false);
  });

  it("rejects misspelled macro fields instead of stripping them", () => {
    expect(
      EditorComponentInputSchema.safeParse({
        label: "Hero",
        type: "block",
        properties: { image: { properties: { src: { imput: "image" } } } }
      }).success
    ).toBe(false);
  });

  it("requires inferred names and types in nested endpoint fields", () => {
    expect(
      EditorComponentResponseSchema.safeParse([
        {
          name: "Hero",
          label: "Hero",
          nodeType: "block",
          slots: [],
          props: {
            image: { name: "image", type: "object", properties: { src: { type: "string" } } }
          }
        }
      ]).success
    ).toBe(false);
  });

  it("rejects a special input on an incompatible endpoint property", () => {
    expect(
      EditorComponentResponseSchema.safeParse([
        {
          name: "Hero",
          label: "Hero",
          nodeType: "block",
          slots: [],
          props: {
            image: {
              name: "image",
              type: "number",
              tags: [{ name: "specialInputType", text: "image" }]
            }
          }
        }
      ]).success
    ).toBe(false);
  });

  it("rejects an unknown specialInputType tag value", () => {
    expect(
      EditorComponentResponseSchema.safeParse([
        {
          name: "Hero",
          label: "Hero",
          nodeType: "block",
          slots: [],
          props: {
            image: {
              name: "image",
              type: "string",
              tags: [{ name: "specialInputType", text: "unknown" }]
            }
          }
        }
      ]).success
    ).toBe(false);
  });
});
