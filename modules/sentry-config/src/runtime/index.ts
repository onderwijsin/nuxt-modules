import type { init } from "@sentry/nuxt";
import type { NitroRuntimeConfig } from "nitropack/types";

export type SentryInitConfig = Parameters<typeof init>[0];

/** Context passed to a server-config resolver when Sentry starts. */
export interface SentryServerConfigContext {
  /** Runtime selected by the module for the current Nitro deployment. */
  runtime: "node-server" | "cloudflare_module";
  /** Resolved Nitro runtime configuration, including environment overrides. */
  runtimeConfig: NitroRuntimeConfig;
}

/** A runtime-aware factory for Sentry server initialization options. */
export type SentryServerConfigResolver = (context: SentryServerConfigContext) => SentryInitConfig;

/** A static Sentry config object or a runtime-aware config resolver. */
export type SentryServerConfigInput = SentryInitConfig | SentryServerConfigResolver;

/**
 * Returns whether the selected Sentry runtime is the Nitro Node server runtime.
 *
 * @param runtime - Runtime selected by the Sentry config module.
 * @returns Whether the runtime is the Node server runtime.
 */
export function isNode(runtime: SentryServerConfigContext["runtime"]): runtime is "node-server" {
  return runtime === "node-server";
}

/**
 * Returns whether the selected Sentry runtime is the Nitro Cloudflare module runtime.
 *
 * @param runtime - Runtime selected by the Sentry config module.
 * @returns Whether the runtime is the Cloudflare module runtime.
 */
export function isCloudflare(
  runtime: SentryServerConfigContext["runtime"]
): runtime is "cloudflare_module" {
  return runtime === "cloudflare_module";
}

const commonDefaults = {
  enabled: true,
  sampleRate: 1,
  tracesSampleRate: 0.1
} satisfies SentryInitConfig;

const legacyDefaults = {
  ...commonDefaults,
  enableLogs: true,
  sendDefaultPii: false
} satisfies SentryInitConfig & { enableLogs: boolean; sendDefaultPii: boolean };

/** Conservative server defaults for SDK 10. */
export const defaultSentryServerConfig = { ...legacyDefaults };

/** Defaults for an application-owned SDK 10 client config. */
export const defaultSentryClientConfig = { ...legacyDefaults };

const piiFieldNames = ["forwarded", "-ip", "remote-", "via", "-user"];
const restrictiveDataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: {
    request: { deny: piiFieldNames },
    response: { deny: piiFieldNames }
  },
  httpBodies: [],
  urlQueryParams: { deny: piiFieldNames },
  databaseQueryData: false,
  genAI: { inputs: false, outputs: false },
  graphQL: { document: false, variables: false },
  queues: false,
  frameContextLines: 7
} satisfies NonNullable<SentryInitConfig["dataCollection"]> & { queues: boolean };

/** Restrictive SDK 11 defaults for both server and client initialization. */
export const defaultSentryConfigV11 = {
  ...commonDefaults,
  dataCollection: restrictiveDataCollection
} satisfies SentryInitConfig;

/**
 * Provides type checking without transforming a consumer-owned Sentry config object or resolver.
 *
 * @param config - Complete Sentry options or a resolver that receives runtime details.
 * @returns The same config object or resolver.
 */
export function defineSentryServerConfig(config: SentryInitConfig): SentryInitConfig;
export function defineSentryServerConfig(
  config: SentryServerConfigResolver
): SentryServerConfigResolver;
export function defineSentryServerConfig(config: SentryServerConfigInput): SentryServerConfigInput {
  return config;
}
