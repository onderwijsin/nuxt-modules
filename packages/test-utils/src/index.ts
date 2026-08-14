import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { fileURLToPath } from "node:url";
import { createEvent, type H3Event } from "h3";
import { setup, type TestOptions } from "@nuxt/test-utils/e2e";
import { cleanupStaleNuxtTestBuilds } from "./cleanup";

export { cleanupStaleNuxtTestBuilds } from "./cleanup";

/**
 * Creates a minimal H3 event for testing server handlers.
 * @returns A minimal H3 event.
 */
export function createTestEvent(): H3Event {
  const request = new IncomingMessage(new Socket());
  return createEvent(request, new ServerResponse(request));
}

/**
 * Resolves a Nuxt test fixture relative to the calling test file.
 * @param metaUrl The URL of the calling test file.
 * @param fixture The fixture directory name.
 * @returns The absolute fixture path.
 */
export function resolveFixture(metaUrl: string | URL, fixture = "basic"): string {
  return fileURLToPath(new URL(`./fixtures/${fixture}`, metaUrl));
}

/**
 * Starts a Nuxt Test Utils fixture relative to the calling test file.
 * @param metaUrl The URL of the calling test file.
 * @param fixture The fixture directory name.
 * @param options Additional Nuxt Test Utils options.
 * @returns A promise that resolves after the fixture starts.
 */
export async function setupFixture(
  metaUrl: string | URL,
  fixture = "basic",
  options?: Partial<Omit<TestOptions, "rootDir">>
) {
  const rootDir = resolveFixture(metaUrl, fixture);
  const nuxtConfig = options?.nuxtConfig;
  const nitroConfig = Reflect.get(nuxtConfig ?? {}, "nitro") ?? {};
  const nitroExternals = Reflect.get(nitroConfig, "externals") ?? {};
  const inline = Reflect.get(nitroExternals, "inline") ?? [];

  await cleanupStaleNuxtTestBuilds(rootDir);

  return setup({
    ...options,
    nuxtConfig: Object.assign({}, nuxtConfig, {
      nitro: Object.assign({}, nitroConfig, {
        externals: Object.assign({}, nitroExternals, {
          // Keep Vue in the Nitro test bundle because the workspace dependency graph can
          // otherwise leave the fixture's generated server without `vue/server-renderer`.
          // This was added on August 10, 2026 after the shared playground layer changed
          // the workspace peer-resolution topology. Removing it makes SSR E2E requests
          // return HTTP 500 with an ERR_MODULE_NOT_FOUND error for that Vue subpath.
          inline: ["vue", ...inline]
        })
      })
    }),
    rootDir
  });
}
