import { describe, expect, it } from "vitest";

import { defineDirectusConfig, validateDirectusConfig } from "../src/config";
import { directusPublicConfigSchema } from "../src/schema";

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
    expect(validateDirectusConfig({})).toEqual({});
  });

  it("drops unknown values from the public projection", () => {
    expect(directusPublicConfigSchema.parse({ unknown: true })).toEqual({});
  });
});
