/**
 * Installs packed workspace packages into a clean Nuxt application outside this workspace.
 */

import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const root = resolve(import.meta.dirname, "..");
const packagesDirectory = resolve(
  process.argv.find((argument) => argument.startsWith("--packages-dir="))?.split("=")[1] ??
    join(root, ".artifacts", "packages")
);
const keepConsumer = process.argv.includes("--keep");
const fixtureDirectory = join(root, "scripts", "fixtures", "external-consumer");
const consumerDirectory = mkdtempSync(join(tmpdir(), "nuxt-external-consumer-"));

/**
 * Runs a command and exits when it fails.
 *
 * @param {string} command - Executable name.
 * @param {string[]} arguments_ - Command arguments.
 */
function run(command, arguments_) {
  const result = spawnSync(command, arguments_, {
    cwd: consumerDirectory,
    env: { ...process.env, COREPACK_ENABLE_PROJECT_SPEC: "0" },
    stdio: "inherit"
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

/**
 * Creates the consumer package manifest with every packed package as a local dependency.
 *
 * @returns {Record<string, string>} Local file dependencies keyed by package name.
 */
function resolvePackedDependencies() {
  return Object.fromEntries(
    manifest.artifacts.map((artifact) => {
      return [artifact.name, `file:${join(packagesDirectory, artifact.filename)}`];
    })
  );
}

if (!existsSync(join(packagesDirectory, "manifest.json"))) {
  throw new Error(`Missing package manifest in ${packagesDirectory}`);
}
const manifest = JSON.parse(readFileSync(join(packagesDirectory, "manifest.json"), "utf8"));
const packedDependencies = resolvePackedDependencies();

cpSync(fixtureDirectory, consumerDirectory, { recursive: true });
writeFileSync(
  join(consumerDirectory, "package.json"),
  `${JSON.stringify(
    {
      name: "external-nuxt-consumer",
      private: true,
      type: "module",
      packageManager: "pnpm@11.13.1",
      dependencies: { nuxt: "4.5.2", ...packedDependencies }
    },
    null,
    2
  )}\n`
);
writeFileSync(
  join(consumerDirectory, "pnpm-workspace.yaml"),
  [
    "allowBuilds:",
    "  esbuild: true",
    "  sharp: true",
    "  vue-demi: true",
    "overrides:",
    ...Object.entries(packedDependencies).map(
      ([name, dependency]) => `  ${JSON.stringify(name)}: ${JSON.stringify(dependency)}`
    ),
    ""
  ].join("\n")
);

console.log(`Installing packed packages into ${consumerDirectory}`);
run("pnpm", ["install", "--no-frozen-lockfile"]);
run("pnpm", ["exec", "nuxt", "prepare"]);
run("pnpm", ["exec", "nuxt", "build"]);

const port = 31_000 + Math.floor(Math.random() * 1_000);
const server = spawn("node", [".output/server/index.mjs"], {
  cwd: consumerDirectory,
  env: { ...process.env, HOST: "127.0.0.1", PORT: String(port) },
  stdio: "inherit"
});

/**
 * Waits for a URL to respond successfully.
 *
 * @param {string} url - URL to poll.
 * @returns {Promise<Response>} The first successful response.
 */
async function waitForResponse(url) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return response;
    } catch {
      // Nitro is still starting.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

try {
  const rootResponse = await waitForResponse(`http://127.0.0.1:${port}/`);
  const rootBody = await rootResponse.text();
  if (!rootBody.includes("External consumer OK")) {
    throw new Error("The external consumer page did not render its assertion text.");
  }

  const pingResponse = await waitForResponse(`http://127.0.0.1:${port}/api/system/ping`);
  if ((await pingResponse.text()) !== "pong")
    throw new Error("Healthcheck ping did not return pong.");
  console.log("External consumer smoke test passed.");
} finally {
  server.kill("SIGTERM");
  if (!keepConsumer) rmSync(consumerDirectory, { recursive: true, force: true });
  else console.log(`Consumer retained at ${consumerDirectory}`);
}
