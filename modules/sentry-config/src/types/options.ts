import type { BaseModuleOptions } from "@onderwijsin/nuxt-module-utils/build";

export const supportedSentryRuntimes = ["node-server", "cloudflare_module"] as const;

export type SentryRuntime = (typeof supportedSentryRuntimes)[number];

/** Configuration for one optional Sentry diagnostic route. */
export interface SentryTestToolRouteOptions {
  /** Route exposed by the diagnostic tool. */
  path?: string;
}

/** Optional diagnostics that validate client and server Sentry capture. */
export interface SentryTestToolsOptions {
  /** Browser diagnostic page. Set to `false` to omit it. */
  page?: SentryTestToolRouteOptions | false;
  /** Server error endpoint. Set to `false` to omit it. */
  endpoint?: SentryTestToolRouteOptions | false;
}

export interface ModuleOptions extends BaseModuleOptions {
  /** Public Sentry DSN exposed to client and server runtime configuration. */
  dsn?: string;
  /**
   * Nitro runtime to configure. When omitted, Cloudflare is detected from Nitro's preset or
   * NITRO_PRESET and every other preset uses the Node server integration.
   */
  runtime?: SentryRuntime;
  /**
   * Consumer source file that default-exports one Sentry initialization options object.
   * Relative paths resolve from the Nuxt application root.
   */
  configFile?: string;
  /** Automatically imports the generated Sentry preload from the Node server entrypoint. */
  autoInjectServerConfig?: boolean;
  /** Removes the duplicate Sentry Nitro Rollup upload pass registered by `@sentry/nuxt`. */
  disableNitroSourceMapUpload?: boolean;
  /** Optional Sentry diagnostic page and deliberate-error endpoint. Set to `false` to omit both. */
  testTools?: SentryTestToolsOptions | false;
}
