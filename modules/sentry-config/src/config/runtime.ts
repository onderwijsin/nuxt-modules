import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { isArray, isRecord, isString } from "@onderwijsin/nuxt-module-utils/shared";

import type { SentryRuntime } from "../types/options";

const SENTRY_NITRO_ROLLUP_PLUGIN_NAME = "sentry-rollup-plugin";
const SENTRY_PRELOAD_FILENAME = "sentry.server.config.mjs";
const VIRTUAL_SENTRY_CONFIG_ID = "\0virtual:onderwijsin-sentry-server-config";

interface RollupPluginLike {
  name: string;
}

interface SentryPreloadPlugin extends RollupPluginLike {
  buildStart(this: {
    emitFile(file: { type: "chunk"; id: string; fileName: string }): string;
  }): void;
  resolveId(source: string): string | null;
  load(id: string): string | null;
}

/**
 * Resolves the supported Sentry runtime, defaulting non-Cloudflare presets to Node.
 *
 * @param configuredRuntime - Explicit module runtime override.
 * @param nitroPreset - Active Nitro preset.
 * @returns The supported Sentry runtime.
 */
export function resolveSentryRuntime(
  configuredRuntime: SentryRuntime | undefined,
  nitroPreset: string | undefined
): SentryRuntime {
  if (configuredRuntime) return configuredRuntime;
  return nitroPreset === "cloudflare_module" ? "cloudflare_module" : "node-server";
}

/**
 * Resolves and verifies a consumer-owned Sentry configuration file.
 *
 * @param rootDir - Nuxt application root.
 * @param configFile - Optional absolute or root-relative source file.
 * @returns The absolute config path, or undefined when defaults are used.
 */
export function resolveSentryConfigFile(
  rootDir: string,
  configFile: string | undefined
): string | undefined {
  if (!configFile) return undefined;
  const resolvedFile = isAbsolute(configFile) ? configFile : resolve(rootDir, configFile);
  if (!existsSync(resolvedFile)) {
    throw new Error(`Sentry server config file was not found: ${resolvedFile}`);
  }
  return resolvedFile;
}

/**
 * Generates a runtime-portable Sentry config resolver.
 *
 * @param runtime - Runtime selected by the module.
 * @param configFile - Optional absolute consumer config path.
 * @returns Generated module source.
 */
export function generateSentryConfigSource(runtime: SentryRuntime, configFile?: string): string {
  const consumerImport = configFile
    ? `import consumerConfig from ${JSON.stringify(configFile)};`
    : "const consumerConfig = {};";

  return `import { useRuntimeConfig } from 'nitropack/runtime';
import { defaultSentryServerConfig } from '@onderwijsin/nuxt-sentry-config/runtime';
${consumerImport}

export function resolveSentryConfig() {
  const resolvedConsumerConfig = typeof consumerConfig === 'function'
    ? consumerConfig({ runtime: ${JSON.stringify(runtime)}, runtimeConfig: useRuntimeConfig() })
    : consumerConfig;
  return { ...defaultSentryServerConfig, ...resolvedConsumerConfig };
}
`;
}

/**
 * Generates the Node preload module that initializes Sentry before Nitro starts.
 *
 * @param configFile - Optional absolute consumer config path.
 * @returns Generated Node preload source.
 */
export function generateNodeSentryConfigSource(configFile?: string): string {
  return `import * as Sentry from '@sentry/nuxt';
${generateSentryConfigSource("node-server", configFile)}
const sentryConfig = resolveSentryConfig();
Sentry.init(sentryConfig);

export default sentryConfig;
`;
}

/**
 * Generates a Cloudflare Sentry config module consumed by the runtime Nitro plugin.
 *
 * @param configFile - Optional absolute consumer config path.
 * @returns Generated Cloudflare plugin source.
 */
export function generateCloudflareSentryPluginSource(configFile?: string): string {
  return generateSentryConfigSource("cloudflare_module", configFile);
}

/**
 * Creates the Rollup entry that emits the Node Sentry preload beside Nitro's server entry.
 *
 * @param configFile - Optional absolute consumer config path.
 * @returns Rollup plugin for the emitted preload entry.
 */
export function createSentryPreloadPlugin(configFile?: string): SentryPreloadPlugin {
  return {
    name: "onderwijsin-sentry-server-config",
    buildStart() {
      this.emitFile({
        type: "chunk",
        id: VIRTUAL_SENTRY_CONFIG_ID,
        fileName: SENTRY_PRELOAD_FILENAME
      });
    },
    resolveId(source) {
      return source === VIRTUAL_SENTRY_CONFIG_ID ? VIRTUAL_SENTRY_CONFIG_ID : null;
    },
    load(id) {
      return id === VIRTUAL_SENTRY_CONFIG_ID ? generateNodeSentryConfigSource(configFile) : null;
    }
  };
}

/**
 * Flattens a Rollup plugin input and removes only the upstream Sentry upload plugin.
 *
 * @param plugins - Arbitrarily nested Rollup plugin input.
 * @returns Plugins without the upstream Sentry upload pass.
 */
export function stripSentryNitroRollupPlugin(plugins?: unknown): RollupPluginLike[] {
  return normalizeRollupPlugins(plugins).filter(
    (plugin) => plugin?.name !== SENTRY_NITRO_ROLLUP_PLUGIN_NAME
  );
}

/**
 * Flattens supported Rollup plugin inputs while discarding null and false entries.
 *
 * @param plugins - Arbitrarily nested Rollup plugin input.
 * @returns Normalized Rollup plugins.
 */
export function normalizeRollupPlugins(plugins?: unknown): RollupPluginLike[] {
  if (!plugins) return [];
  if (!isArray(plugins)) return isRollupPlugin(plugins) ? [plugins] : [];
  return plugins.flatMap((plugin) => normalizeRollupPlugins(plugin));
}

function isRollupPlugin(value: unknown): value is RollupPluginLike {
  return isRecord(value) && isString(value.name);
}

/**
 * Adds the generated Sentry preload as the first import in a Node Nitro entrypoint.
 *
 * @param entryFile - Absolute Nitro entrypoint path.
 * @returns Whether the entrypoint was changed.
 */
export async function injectSentryPreloadImport(entryFile: string): Promise<boolean> {
  const source = await readFile(entryFile, "utf8");
  const importStatement = `import './${SENTRY_PRELOAD_FILENAME}';`;
  if (source.startsWith(importStatement)) return false;
  await writeFile(entryFile, `${importStatement}\n${source}`, "utf8");
  return true;
}
