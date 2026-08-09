import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { fileURLToPath } from "node:url";
import { createEvent, type H3Event } from "h3";
import { setup, type TestOptions } from "@nuxt/test-utils/e2e";

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
export function setupFixture(
  metaUrl: string | URL,
  fixture = "basic",
  options?: Partial<Omit<TestOptions, "rootDir">>
) {
  return setup({ ...options, rootDir: resolveFixture(metaUrl, fixture) });
}
