import { describe, expect, it } from "vitest";

import {
  createSentryPreloadPlugin,
  generateCloudflareSentryPluginSource,
  generateNodeSentryConfigSource,
  normalizeRollupPlugins,
  resolveSentryRuntime,
  stripSentryNitroRollupPlugin
} from "../src/config/runtime";
import { defineSentryServerConfig, isCloudflare, isNode } from "../src/runtime";

describe("Sentry runtime configuration", () => {
  it("preserves static configs and runtime-aware config resolvers", () => {
    const staticConfig = { enabled: false };
    const resolver = defineSentryServerConfig(({ runtime }) => ({
      enabled: runtime === "node-server"
    }));

    expect(defineSentryServerConfig(staticConfig)).toBe(staticConfig);
    expect(resolver).toBeTypeOf("function");
  });

  it("defaults to Node and detects the Cloudflare module preset", () => {
    expect(resolveSentryRuntime(undefined, undefined)).toBe("node-server");
    expect(resolveSentryRuntime(undefined, "cloudflare_module")).toBe("cloudflare_module");
    expect(resolveSentryRuntime("node-server", "cloudflare_module")).toBe("node-server");
  });

  it("identifies supported runtimes", () => {
    expect(isNode("node-server")).toBe(true);
    expect(isNode("cloudflare_module")).toBe(false);
    expect(isCloudflare("cloudflare_module")).toBe(true);
    expect(isCloudflare("node-server")).toBe(false);
  });

  it("generates runtime-specific wiring around the same consumer config", () => {
    const configFile = "/project/sentry.config.ts";
    const nodeSource = generateNodeSentryConfigSource(configFile);
    const cloudflareSource = generateCloudflareSentryPluginSource(configFile);

    expect(nodeSource).toContain(`import consumerConfig from "${configFile}"`);
    expect(nodeSource).toContain("Sentry.init(sentryConfig)");
    expect(nodeSource).toContain('runtime: "node-server"');
    expect(cloudflareSource).toContain("export function resolveSentryConfig()");
    expect(cloudflareSource).toContain(`import consumerConfig from "${configFile}"`);
    expect(cloudflareSource).toContain('runtime: "cloudflare_module"');
    expect(cloudflareSource).toContain("runtimeConfig: useRuntimeConfig()");
  });

  it("uses defaults when no consumer config file is provided", () => {
    expect(generateNodeSentryConfigSource()).toContain("const consumerConfig = {};");
  });

  it("emits the Node preload as a dedicated Rollup chunk", () => {
    const plugin = createSentryPreloadPlugin();
    const emitted: unknown[] = [];
    plugin.buildStart.call({
      emitFile(file) {
        emitted.push(file);
        return "sentry-config";
      }
    });

    expect(emitted).toEqual([
      {
        type: "chunk",
        id: "\0virtual:onderwijsin-sentry-server-config",
        fileName: "sentry.server.config.mjs"
      }
    ]);
  });

  it("removes only the duplicate Sentry Nitro upload pass", () => {
    expect(
      stripSentryNitroRollupPlugin([[{ name: "sentry-rollup-plugin" }], false, { name: "nitro" }])
    ).toEqual([{ name: "nitro" }]);
  });

  it("narrows Rollup plugin values safely", () => {
    expect(normalizeRollupPlugins([null, false, new Date(), { name: "nitro" }])).toEqual([
      { name: "nitro" }
    ]);
  });
});
