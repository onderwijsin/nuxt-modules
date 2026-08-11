import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const rootDirectory = fileURLToPath(new URL("../../../", import.meta.url));
const playgroundDirectory = fileURLToPath(new URL("../playground", import.meta.url));
const sentryEnvironment = {
  ...process.env,
  SENTRY_AUTH_TOKEN: "test-token",
  SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
  SENTRY_ORG: "test-org",
  SENTRY_PROJECT: "test-project",
  SENTRY_UPLOAD_SOURCE_MAPS: "false"
};

function buildPlayground(script: "build:cloudflare" | "build:node") {
  execFileSync("corepack", ["pnpm", "--filter", "sentry-config-playground", script], {
    cwd: rootDirectory,
    env: sentryEnvironment,
    stdio: "inherit"
  });
}

function readClientArtifacts(): string {
  const clientDirectory = join(playgroundDirectory, ".output", "public", "_nuxt");
  return readdirSync(clientDirectory, { encoding: "utf8", recursive: true })
    .filter((path) => path.endsWith(".js"))
    .map((path) => readFileSync(join(clientDirectory, path), "utf8"))
    .join("\n");
}

function readServerArtifacts(): string {
  const serverDirectory = join(playgroundDirectory, ".output", "server");
  return readdirSync(serverDirectory, { encoding: "utf8", recursive: true })
    .filter((path) => path.endsWith(".mjs"))
    .map((path) => readFileSync(join(serverDirectory, path), "utf8"))
    .join("\n");
}

describe("sentry-config production artifacts", () => {
  it("emits the Node preload and client defaults without Nitro source-map uploads", () => {
    buildPlayground("build:node");

    const serverDirectory = join(playgroundDirectory, ".output", "server");
    const preloadPath = join(serverDirectory, "sentry.server.config.mjs");
    const entryPath = join(serverDirectory, "index.mjs");

    expect(existsSync(preloadPath)).toBe(true);
    expect(readFileSync(preloadPath, "utf8")).toContain('runtime: "node-server"');
    expect(readFileSync(preloadPath, "utf8")).toContain("init(sentryConfig)");
    expect(readFileSync(entryPath, "utf8")).toMatch(/^import '\.\/sentry\.server\.config\.mjs';/);
    expect(readClientArtifacts()).toContain("sendDefaultPii");
  }, 30_000);

  it("emits a Cloudflare Worker containing the Cloudflare Sentry configuration", () => {
    buildPlayground("build:cloudflare");

    const workerPath = join(playgroundDirectory, ".output", "server", "index.mjs");
    expect(existsSync(workerPath)).toBe(true);
    expect(readServerArtifacts()).toContain('runtime:"cloudflare_module"');
  }, 30_000);
});
