import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  DIRECTUS_TYPEGEN_VERSION,
  applyTypegenTransforms,
  createTypegenFingerprint,
  generateDirectusTypesFile,
  readTypegenCache,
  resolveDirectusTypegenDeclaration,
  writeTypegenCache
} from "../src/config/typegen";

vi.mock("directus-sdk-typegen", () => ({
  generateDirectusTypes: vi.fn(
    async () => `
export enum RemoveMe { A = "a" }
export interface Article {
  /** @required */
  title?: string;
  nullable?: string | null;
  record: Record<string, any>;
  json: "json" | null;
  candidate: CandidateStatuse;
  nested?: {
    value: string;
  };
}
export interface Schema {
  articles: Article[];
}
`
  )
}));

const disabledAugmentations = {
  removeEnums: false,
  replaceAnyWithUnknown: false,
  replaceJsonWithJSON: false,
  applyTypeNameOverrides: false,
  makeNonNullableOptionalsRequired: false,
  mergeJsDocs: false
};

const enabled = (name: keyof typeof disabledAugmentations) => ({
  ...disabledAugmentations,
  [name]: true
});

const augmentationCases: ReadonlyArray<[keyof typeof disabledAugmentations, string]> = [
  ["removeEnums", "export enum RemoveMe"],
  ["replaceAnyWithUnknown", "Record<string, unknown>"],
  ["replaceJsonWithJSON", "json: JSON | null;"],
  ["applyTypeNameOverrides", "candidate: CandidateStatus;"],
  ["makeNonNullableOptionalsRequired", "title: string;"],
  ["mergeJsDocs", "* @required"]
];

describe("Directus typegen transforms", () => {
  it("keeps the base generator output unchanged when augmentations are disabled", async () => {
    const source = await generateDirectusTypesFile({
      directusUrl: "https://directus.example.test",
      directusToken: "introspection-token",
      augmentations: disabledAugmentations,
      rules: {}
    });

    expect(source).toContain("export enum RemoveMe");
    expect(source).toContain("Record<string, any>");
    expect(source).toContain('"json" | null');
  });

  it.each(augmentationCases)("applies the %s augmentation independently", (name, expected) => {
    const source = applyTypegenTransforms(
      `/** @required */\n/** @required */\n${`export enum RemoveMe { A = "a" }`}\nexport interface Article {\n  title?: string;\n  record: Record<string, any>;\n  json: "json" | null;\n  candidate: CandidateStatuse;\n}`,
      { augmentations: enabled(name), rules: {} }
    );

    if (name === "removeEnums") expect(source).not.toContain(expected);
    else expect(source).toContain(expected);
  });

  it("rewrites multiline fields and validates consumer rules", () => {
    const source = applyTypegenTransforms(
      `export interface Article {\n  metadata?: {\n    title: string;\n  };\n}`,
      {
        augmentations: disabledAugmentations,
        rules: { Article: { metadata: "Record<string, string>" } }
      }
    );

    expect(source).toContain("metadata?: Record<string, string>;");
    expect(() =>
      applyTypegenTransforms("export interface Article { title: string; }", {
        augmentations: disabledAugmentations,
        rules: { Missing: { title: "string" } }
      })
    ).toThrow('missing collection "Missing"');
    expect(() =>
      applyTypegenTransforms("export interface Article { title: string; }", {
        augmentations: disabledAugmentations,
        rules: { Article: { missing: "string" } }
      })
    ).toThrow('missing field "Article.missing"');
  });

  it("composes rules before a custom transform", () => {
    const source = applyTypegenTransforms("export interface Article { title: string; }", {
      directusUrl: "https://directus.example.test",
      augmentations: disabledAugmentations,
      rules: { Article: { title: "number" } },
      transform: (value, context) => `${value}\n// ${context.collections.join(",")}`
    });

    expect(source).toContain("title: number;");
    expect(source).toContain("// Article");
  });

  it("uses only a matching development cache manifest", async () => {
    const directory = mkdtempSync(join(tmpdir(), "directus-typegen-"));
    const cacheFile = join(directory, "cache.json");
    const generatedFile = join(directory, "directus-schema.d.ts");
    const fingerprints = createTypegenFingerprint("https://directus.example.test", {
      augmentations: disabledAugmentations,
      rules: {}
    });
    const manifest = {
      ...fingerprints,
      generatorVersion: DIRECTUS_TYPEGEN_VERSION,
      generatedAt: Date.now(),
      source: "export interface Schema {}\n"
    };

    await writeTypegenCache(cacheFile, manifest);
    await expect(
      readTypegenCache(cacheFile, generatedFile, manifest, 60_000, true, false)
    ).resolves.toBe(manifest.source);
    await expect(
      readTypegenCache(cacheFile, generatedFile, manifest, 60_000, false, false)
    ).resolves.toBeUndefined();
    await expect(
      readTypegenCache(
        cacheFile,
        generatedFile,
        { ...manifest, optionsFingerprint: "changed" },
        60_000,
        true,
        false
      )
    ).resolves.toBeUndefined();
    expect(JSON.parse(readFileSync(cacheFile, "utf8"))).not.toHaveProperty("token");
  });

  it("falls back to an empty schema without credentials and fails partial production configuration", async () => {
    const log = { warn: vi.fn(), error: vi.fn() };
    const directory = mkdtempSync(join(tmpdir(), "directus-typegen-missing-"));
    const generatedFile = join(directory, "directus-schema.d.ts");
    writeFileSync(generatedFile, "");

    await expect(
      resolveDirectusTypegenDeclaration({
        directusUrl: "",
        augmentations: disabledAugmentations,
        rules: {},
        cacheFile: join(directory, "cache.json"),
        generatedFile,
        maxAge: 60_000,
        isDevelopment: true,
        isCI: false,
        log
      })
    ).resolves.toBe("export interface Schema {}\n");
    await expect(
      resolveDirectusTypegenDeclaration({
        directusUrl: "https://directus.example.test",
        directusToken: undefined,
        augmentations: disabledAugmentations,
        rules: {},
        cacheFile: join(directory, "cache.json"),
        generatedFile,
        maxAge: 60_000,
        isDevelopment: false,
        isCI: false,
        log
      })
    ).rejects.toThrow("requires both directus.baseUrl");
    writeFileSync(generatedFile, "export interface Schema { articles: Article[]; }\n");
    await expect(
      resolveDirectusTypegenDeclaration({
        directusUrl: "",
        augmentations: disabledAugmentations,
        rules: {},
        cacheFile: join(directory, "cache.json"),
        generatedFile,
        maxAge: 60_000,
        isDevelopment: true,
        isCI: false,
        log
      })
    ).resolves.toContain("articles");
  });

  it("skips type generation when explicitly disabled", async () => {
    const log = { warn: vi.fn(), error: vi.fn() };
    const directory = mkdtempSync(join(tmpdir(), "directus-typegen-disabled-"));

    await expect(
      resolveDirectusTypegenDeclaration({
        enabled: false,
        directusUrl: "https://directus.example.test",
        directusToken: "introspection-token",
        augmentations: disabledAugmentations,
        rules: {},
        cacheFile: join(directory, "cache.json"),
        generatedFile: join(directory, "directus-schema.d.ts"),
        maxAge: 60_000,
        isDevelopment: false,
        isCI: true,
        log
      })
    ).resolves.toBe("export interface Schema {}\n");
    expect(log.warn).toHaveBeenCalledWith(
      "Skipping Directus type generation because directus.typegen.enabled is false."
    );
  });

  it("logs the generator boundary when the Directus generator fails", async () => {
    const { generateDirectusTypes } = await import("directus-sdk-typegen");
    const log = { warn: vi.fn(), error: vi.fn() };
    vi.mocked(generateDirectusTypes).mockRejectedValueOnce(new Error("upstream unavailable"));

    await expect(
      generateDirectusTypesFile({
        directusUrl: "https://directus.example.test",
        directusToken: "introspection-token",
        augmentations: disabledAugmentations,
        rules: {},
        log
      })
    ).rejects.toThrow("upstream unavailable");
    expect(log.error).toHaveBeenCalledWith("Directus schema type generation failed.");
  });
});
