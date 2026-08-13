import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { consumerModules, getLayerName } from "../layer-registry.mjs";
import {
  findMissingWorkspaceDependencies,
  resolvePackedDependencies,
  resolveProfile
} from "../profile.mjs";

const fixtureDirectory = resolve(import.meta.dirname, "../fixture");

describe("external consumer profile", () => {
  it("selects only modules represented by packed artifacts", () => {
    const manifest = {
      artifacts: [
        { name: "@onderwijsin/nuxt-device", filename: "device.tgz" },
        { name: "@onderwijsin/nuxt-cache", filename: "cache.tgz" },
        { name: "@onderwijsin/module-utils", filename: "utils.tgz" }
      ]
    };

    expect(
      resolveProfile(manifest, [
        "@onderwijsin/nuxt-cache",
        "@onderwijsin/nuxt-device",
        "@onderwijsin/nuxt-healthcheck"
      ])
    ).toEqual({
      packageNames: [
        "@onderwijsin/module-utils",
        "@onderwijsin/nuxt-cache",
        "@onderwijsin/nuxt-device"
      ],
      modules: ["@onderwijsin/nuxt-cache", "@onderwijsin/nuxt-device"],
      full: false
    });
  });

  it("recognizes a full profile only when every known module is packed", () => {
    const modules = ["@onderwijsin/nuxt-cache", "@onderwijsin/nuxt-device"];

    expect(resolveProfile({ artifacts: modules.map((name) => ({ name })) }, modules).full).toBe(
      true
    );
  });

  it("uses exact local tarball paths for every artifact", () => {
    expect(
      resolvePackedDependencies(
        { artifacts: [{ name: "@test/module", filename: "module-1.0.0.tgz" }] },
        "/tmp/artifacts",
        join
      )
    ).toEqual({ "@test/module": "file:/tmp/artifacts/module-1.0.0.tgz" });
  });

  it("rejects missing internal dependencies instead of allowing registry fallback", () => {
    expect(
      findMissingWorkspaceDependencies(
        { artifacts: [{ name: "@onderwijsin/nuxt-directus-sitemaps" }] },
        [
          {
            name: "@onderwijsin/nuxt-directus-sitemaps",
            dependencies: {
              "@onderwijsin/nuxt-directus-client": "^0.3.0",
              "@nuxtjs/sitemap": "8.3.0"
            }
          }
        ]
      )
    ).toEqual(["@onderwijsin/nuxt-directus-sitemaps -> @onderwijsin/nuxt-directus-client"]);
  });

  it("accepts a complete internal dependency closure", () => {
    expect(
      findMissingWorkspaceDependencies(
        {
          artifacts: [
            { name: "@onderwijsin/nuxt-directus-sitemaps" },
            { name: "@onderwijsin/nuxt-directus-client" }
          ]
        },
        [
          {
            name: "@onderwijsin/nuxt-directus-sitemaps",
            dependencies: { "@onderwijsin/nuxt-directus-client": "^0.3.0" }
          }
        ]
      )
    ).toEqual([]);
  });
});

describe("external consumer fixture", () => {
  it("has a layer contract for every discovered module", () => {
    for (const module of consumerModules) {
      const layer = getLayerName(module);
      const layerDirectory = join(fixtureDirectory, "consumer-layers", layer);

      expect(existsSync(join(layerDirectory, "nuxt.config.ts"))).toBe(true);
      expect(existsSync(join(layerDirectory, "server", "api", "sanity", `${layer}.get.ts`))).toBe(
        true
      );
      const pagePath = join(layerDirectory, "app", "pages", "sanity", `${layer}.vue`);
      expect(existsSync(pagePath)).toBe(true);
      expect(readFileSync(pagePath, "utf8")).toContain(`:data-sanity="layerName"`);
    }
  });
});
