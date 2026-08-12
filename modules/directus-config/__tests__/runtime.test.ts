import { describe, expect, it } from "vitest";

import { defineDirectusConfig, validateDirectusConfig } from "../src/config";
import { directusConfigSchema, directusPublicConfigSchema } from "../src/schema";

describe("Directus config helpers", () => {
  it("validates shared instance and client configuration", () => {
    const config = defineDirectusConfig({
      instance: { baseUrl: "https://cms.example.test" },
      client: { preview: {} }
    });

    const validated = validateDirectusConfig(config);
    expect(validated.instance?.baseUrl).toBe("https://cms.example.test");
    expect(directusPublicConfigSchema.parse(validated)).toEqual({
      client: expect.objectContaining({
        proxy: { path: "/_directus/proxy" },
        preview: expect.any(Object),
        auth: expect.any(Object)
      })
    });
    expect(directusPublicConfigSchema.parse(validated)).not.toHaveProperty("instance");
    expect(directusPublicConfigSchema.parse(validated)).not.toHaveProperty("client.commands");
    expect(directusPublicConfigSchema.parse(validated)).not.toHaveProperty("client.typegen");
    expect(directusPublicConfigSchema.parse(validated)).not.toHaveProperty("client.auth.cookie");
    expect(() => validateDirectusConfig({ instance: { baseUrl: "not-a-url" } })).toThrow(
      "Invalid directus.config.ts configuration."
    );
  });

  it("accepts an empty optional shared configuration", () => {
    expect(validateDirectusConfig({})).toEqual({ collections: [] });
  });

  it("drops unknown values from the public projection", () => {
    expect(directusPublicConfigSchema.parse({ unknown: true })).toEqual({});
  });

  it("rejects invalid strict configuration at every shared boundary", () => {
    expect(() => validateDirectusConfig({ unknown: true })).toThrow(
      "Invalid directus.config.ts configuration."
    );
    expect(() => validateDirectusConfig({ client: { unknown: true } })).toThrow(
      "Invalid directus.config.ts configuration."
    );
    expect(() =>
      validateDirectusConfig({
        client: { proxy: { path: "/_directus/auth/session" } }
      })
    ).toThrow("Invalid directus.config.ts configuration.");
    expect(() =>
      validateDirectusConfig({
        collections: [{ collection: "articles", sitemap: false, prerender: false, unknown: true }]
      })
    ).toThrow("Invalid directus.config.ts configuration.");
  });

  it("accepts executable collection configuration and omits it from public output", () => {
    const fetcher = async () => [{ slug: "welcome" }];
    const mapper = () => ({ loc: "/welcome", priority: 0.8 });
    const validated = validateDirectusConfig({
      collections: [
        {
          collection: "articles",
          sitemap: {
            _sitemap: "articles",
            fields: ["slug"],
            filter: { status: { _eq: "published" } },
            fetcher,
            mapper
          },
          prerender: false
        }
      ],
      sitemaps: {
        static: [{ loc: "/" }],
        cache: false,
        prerenderSitemaps: true
      }
    });

    expect(validated.collections?.[0]?.sitemap).toMatchObject({
      _sitemap: "articles",
      fields: ["slug"],
      fetcher,
      mapper
    });
    expect(validated.sitemaps).toMatchObject({ cache: false, prerenderSitemaps: true });
    expect(directusPublicConfigSchema.parse(validated)).toEqual({});
  });

  it("rejects invalid collection functions and sitemap entry shapes", () => {
    expect(() =>
      directusConfigSchema.parse({
        collections: [
          {
            collection: "articles",
            sitemap: { mapper: "not-a-function" },
            prerender: false
          }
        ]
      })
    ).toThrow();
    expect(() =>
      directusConfigSchema.parse({
        collections: [
          {
            collection: "articles",
            sitemap: { _sitemap: " ", mapper: () => ({ loc: "/articles" }) },
            prerender: false
          }
        ]
      })
    ).toThrow();
    expect(() =>
      directusConfigSchema.parse({
        sitemaps: { cache: { maxAge: -1 } }
      })
    ).toThrow();
  });
});
