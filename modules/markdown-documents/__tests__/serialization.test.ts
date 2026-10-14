import { describe, expect, it, vi } from "vitest";
import { parse } from "yaml";
import { prepareDocumentDefinition } from "../src/runtime/server/definition";
import { serializeMarkdownDocument } from "../src/runtime/server/serialize";

/** Resolves arbitrary metadata through the consumer validation boundary.
 * @param frontmatter Consumer metadata.
 * @returns A validated structured document.
 */
function resolve(frontmatter: Record<string, unknown>) {
  return prepareDocumentDefinition(
    { route: "/test", fetch: () => true, transform: () => ({ frontmatter, body: "# Body" }) },
    "example.ts"
  ).resolve({ params: {} });
}

describe("JSON frontmatter and YAML delivery", () => {
  it("round-trips nested JSON values and scalar-looking strings without aliases", async () => {
    const shared = { title: "Unicode café 日本語", lines: "one\ntwo\n", escape: '"\\---' };
    const frontmatter = {
      first: shared,
      second: shared,
      values: [true, false, null, 2, -3.5, "true", "123", "2020-01-01", "---"]
    };
    const document = await resolve(frontmatter);
    expect(document).not.toBeNull();
    if (!document) throw new Error("Expected document");
    const serialized = serializeMarkdownDocument(document);
    expect(parse(serialized.slice(4, serialized.lastIndexOf("---\n")))).toEqual(frontmatter);
    expect(serialized).not.toMatch(/[&*]a[0-9]/u);
    expect(serialized.endsWith("---\n# Body")).toBe(true);
    expect(document.frontmatter).toEqual(frontmatter);
  });

  it.each([
    undefined,
    NaN,
    Infinity,
    -Infinity,
    1n,
    () => true,
    Symbol("secret"),
    new Date(),
    new Map(),
    new Set(),
    new (class Source {})(),
    Array(2)
  ])("rejects non-JSON metadata with its property path (%s)", async (value) => {
    await expect(resolve({ nested: { invalid: value } })).rejects.toThrow(
      /frontmatter.nested.invalid/
    );
  });

  it("rejects cycles, symbol keys and getters without executing them", async () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    await expect(resolve({ circular })).rejects.toThrow(/Circular/);
    await expect(resolve({ [Symbol("key")]: true })).rejects.toThrow(/Symbol keys/);
    const getter = vi.fn(() => "secret");
    await expect(
      resolve({ nested: Object.defineProperty({}, "token", { enumerable: true, get: getter }) })
    ).rejects.toThrow(/Accessors/);
    expect(getter).not.toHaveBeenCalled();
  });

  it("accepts null-prototype objects", async () => {
    await expect(
      resolve({ nested: Object.assign(Object.create(null), { title: "Public" }) })
    ).resolves.toMatchObject({ frontmatter: { nested: { title: "Public" } } });
  });

  it("returns an empty metadata body unchanged and distinguishes horizontal rules", () => {
    const body = "---\nOrdinary Markdown\n\n---\n# Heading";
    expect(serializeMarkdownDocument({ frontmatter: {}, body })).toBe(body);
    expect(serializeMarkdownDocument({ frontmatter: { title: "Metadata" }, body })).toContain(body);
  });

  it.each(["---\ntitle: Duplicate\n---\nBody", "\uFEFF---\r\ntitle: Duplicate\r\n...\r\nBody"])(
    "rejects body-owned frontmatter",
    (body) => {
      expect(() => serializeMarkdownDocument({ frontmatter: {}, body })).toThrow(
        /body must not contain/
      );
    }
  );
});
