/**
 * Installs the selected packed workspace packages into a clean Nuxt application.
 * The artifact manifest is the profile source of truth; internal workspace dependencies cannot
 * fall back to the registry.
 */
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { consumerModules, getLayerName } from "./layer-registry.mjs";
import {
  findMissingWorkspaceDependencies,
  resolvePackedDependencies,
  resolveProfile
} from "./profile.mjs";

const root = resolve(import.meta.dirname, "../..");
const packagesDirectory = resolve(
  process.argv.find((a) => a.startsWith("--packages-dir="))?.split("=")[1] ??
    join(root, ".artifacts", "packages")
);
const keepConsumer = process.argv.includes("--keep");
const directusDisabled = process.argv.includes("--directus-disabled");
const fixtureDirectory = join(import.meta.dirname, "fixture");
const consumerEnvironment = {
  ...process.env,
  ...(directusDisabled ? { DIRECTUS_EXTERNAL_DISABLED: "true" } : {})
};

/**
 * Runs a command inside the temporary consumer and forwards its output.
 *
 * @param {string} command - Executable to invoke.
 * @param {string[]} arguments_ - Arguments passed to the executable.
 * @param {string} cwd - Working directory for the child process.
 * @returns {void}
 */
function run(command, arguments_, cwd) {
  const result = spawnSync(command, arguments_, {
    cwd,
    env: consumerEnvironment,
    stdio: "inherit"
  });
  if (result.status !== 0) {
    const reason = result.signal ? `signal ${result.signal}` : `exit code ${result.status}`;
    throw new Error(`${command} ${arguments_.join(" ")} failed with ${reason}.`);
  }
}

/**
 * Reads the artifact manifest produced by the package packer.
 *
 * @returns {{artifacts: Array<{name: string, filename: string}>}} Packed artifact manifest.
 */
function readManifest() {
  const manifestPath = join(packagesDirectory, "manifest.json");
  if (!existsSync(manifestPath))
    throw new Error(`Missing package manifest in ${packagesDirectory}`);
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

/**
 * Selects the consumer layers backed by the local artifact set.
 *
 * @param {{artifacts: Array<{name: string}>}} manifest - Packed artifact manifest.
 * @returns {{packageNames: string[], modules: string[], full: boolean}} Consumer profile.
 */
function getProfile(manifest) {
  return resolveProfile(manifest, consumerModules);
}

/**
 * Converts manifest entries to exact local tarball dependencies.
 *
 * @param {{artifacts: Array<{name: string, filename: string}>}} manifest - Packed artifacts.
 * @returns {Record<string, string>} Package names mapped to local file dependencies.
 */
function getPackedDependencies(manifest) {
  return resolvePackedDependencies(manifest, packagesDirectory, join);
}

/**
 * Verifies that packed workspace dependencies cannot silently come from npm.
 *
 * Third-party dependencies are intentionally left to pnpm's normal resolver. Internal
 * `@onderwijsin/nuxt-*` dependencies must be represented by matching local artifacts so
 * the consumer validates one coherent release set.
 *
 * @param {{artifacts: Array<{name: string, filename: string}>}} manifest - Packed artifacts.
 * @returns {void}
 */
function validateWorkspaceDependencies(manifest) {
  const packageManifests = manifest.artifacts.map((artifact) => {
    const archive = join(packagesDirectory, artifact.filename);
    if (!existsSync(archive)) throw new Error(`Missing packed artifact: ${archive}`);
    try {
      const packageManifest = JSON.parse(
        execFileSync("tar", ["-xOf", archive, "package/package.json"], { encoding: "utf8" })
      );
      if (packageManifest.name !== artifact.name)
        throw new Error(
          `Manifest entry ${artifact.name} contains package metadata for ${packageManifest.name}.`
        );
      return packageManifest;
    } catch (error) {
      throw new Error(`Could not read package metadata from ${archive}.`, { cause: error });
    }
  });
  const missing = findMissingWorkspaceDependencies(manifest, packageManifests);
  if (missing.length)
    throw new Error(`Packed artifact set is missing internal dependencies:\n${missing.join("\n")}`);
}

/**
 * Resolves and then freezes the temporary consumer dependency graph.
 *
 * @param {string} consumerDirectory - Temporary consumer directory.
 * @returns {void}
 */
function installConsumerDependencies(consumerDirectory) {
  run(
    "pnpm",
    ["install", "--lockfile-only", "--ignore-scripts", "--prefer-offline"],
    consumerDirectory
  );
  run("pnpm", ["install", "--frozen-lockfile", "--ignore-scripts"], consumerDirectory);
}

/**
 * Polls an HTTP endpoint while the Nitro server starts.
 *
 * @param {string} url - URL to request.
 * @param {RequestInit} [options] - Fetch options.
 * @param {number} [expectedStatus] - Required response status; defaults to 200.
 * @returns {Promise<Response>} Ready response.
 */
async function waitForResponse(url, options = {}, expectedStatus = 200) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(2_000) });
      if (response.status === expectedStatus) return response;
    } catch {}
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

/**
 * Parses a JSON response and applies a focused assertion.
 *
 * @param {Response} response - Response to parse.
 * @param {(body: Record<string, any>) => boolean} assertion - Validation predicate.
 * @returns {Promise<Record<string, any>>} Parsed response body.
 */
async function readJson(response, assertion) {
  const body = await response.json();
  if (!assertion(body))
    throw new Error(`External consumer assertion failed: ${JSON.stringify(body)}`);
  return body;
}

/**
 * Runs checks shared by focused and full profiles.
 *
 * Every active layer must expose both an API sanity endpoint and a page that
 * fetches that endpoint. This ensures the module works at the server boundary
 * and survives Nuxt's client/server build and rendering pipeline.
 *
 * @param {number} port - Nitro server port.
 * @param {{modules: string[], full: boolean}} profile - Selected consumer profile.
 * @returns {Promise<void>}
 */
async function runFocusedAssertions(port, profile) {
  await readJson(
    await waitForResponse(`http://127.0.0.1:${port}/api/consumer/profile`),
    (body) =>
      body.full === profile.full &&
      JSON.stringify(body.layers) === JSON.stringify(profile.modules.map(getLayerName))
  );
  for (const module of profile.modules) {
    const layer = getLayerName(module);
    await readJson(
      await waitForResponse(`http://127.0.0.1:${port}/api/sanity/${layer}`),
      (body) => body.layer === layer
    );
    const page = await (await waitForResponse(`http://127.0.0.1:${port}/sanity/${layer}`)).text();
    if (!page.includes(`data-sanity="${layer}"`) || !page.includes(layer))
      throw new Error(`External consumer page assertion failed for layer ${layer}.`);
  }
}

/**
 * Runs the additional release-facing assertions for a complete artifact set.
 *
 * @param {number} port - Nitro server port.
 * @param {{modules: string[], full: boolean}} profile - Selected consumer profile.
 * @returns {Promise<void>}
 */
async function runFullAssertions(port, profile) {
  if (
    profile.modules.includes("@onderwijsin/nuxt-healthcheck") &&
    (await (await waitForResponse(`http://127.0.0.1:${port}/api/system/ping`)).text()) !== "pong"
  )
    throw new Error("Healthcheck ping did not return pong.");
  await readJson(
    await waitForResponse(`http://127.0.0.1:${port}/api/_directus-sitemaps/urls`),
    (body) => Array.isArray(body)
  );
  if (profile.modules.includes("@onderwijsin/nuxt-healthcheck"))
    await readJson(
      await waitForResponse(`http://127.0.0.1:${port}/api/system/health`),
      (body) => body.data?.status === "ok"
    );
  if (profile.modules.includes("@onderwijsin/nuxt-storage-admin"))
    await readJson(
      await waitForResponse(`http://127.0.0.1:${port}/api/_storage/config`, {
        headers: { "x-admin-token": "dummy-storage-token" }
      }),
      (body) => body.data?.mounts?.some((mount) => mount.mount === "cache")
    );
  if (profile.modules.includes("@onderwijsin/nuxt-redirects")) {
    await readJson(
      await waitForResponse(`http://127.0.0.1:${port}/api/sanity/redirects`, { method: "POST" }),
      (body) => body.data?.["/redirect-sanity"]?.to === "/"
    );
    await waitForResponse(`http://127.0.0.1:${port}/api/_redirects/%2Fredirect-sanity`);
  }
  await waitForResponse(`http://127.0.0.1:${port}/thema`);
  if (profile.modules.includes("@onderwijsin/nuxt-webmanifest"))
    await readJson(
      await waitForResponse(`http://127.0.0.1:${port}/app.webmanifest`),
      (body) => body.name === "External consumer validation"
    );
}

export async function main() {
  // The manifest is deliberately read before copying the fixture so the selected profile
  // controls the generated dependency metadata and the fixture's conditional Nuxt config.
  const manifest = readManifest();
  validateWorkspaceDependencies(manifest);
  const profile = getProfile(manifest);
  const packedDependencies = getPackedDependencies(manifest);
  const consumerDirectory = mkdtempSync(join(tmpdir(), "nuxt-external-consumer-"));
  try {
    // The temporary directory is outside the workspace: this validates packed output rather
    // than accidentally resolving workspace symlinks or source files.
    cpSync(fixtureDirectory, consumerDirectory, { recursive: true });
    writeFileSync(
      join(consumerDirectory, "consumer-profile.json"),
      `${JSON.stringify({ layers: profile.modules.map(getLayerName), full: profile.full }, null, 2)}\n`
    );
    writeFileSync(
      join(consumerDirectory, "package.json"),
      `${JSON.stringify({ name: "external-nuxt-consumer", private: true, type: "module", packageManager: "pnpm@11.13.1", dependencies: { nuxt: "4.5.2", ...packedDependencies } }, null, 2)}\n`
    );
    writeFileSync(
      join(consumerDirectory, "pnpm-workspace.yaml"),
      [
        "allowBuilds:",
        "  '@sentry/cli': true",
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
    console.log(
      `Consumer profile: ${profile.full ? "full" : "focused"} (${profile.modules.map(getLayerName).join(", ") || "base"})`
    );
    // Resolve once, then install frozen so validation cannot silently change the graph.
    installConsumerDependencies(consumerDirectory);
    run("pnpm", ["exec", "nuxt", "prepare"], consumerDirectory);
    run("pnpm", ["exec", "nuxt", "build"], consumerDirectory);
    const serverEntryPath = join(consumerDirectory, ".output", "server", "index.mjs");
    if (!existsSync(serverEntryPath))
      throw new Error(`Nitro Node entrypoint was not emitted: ${serverEntryPath}`);
    if (profile.modules.includes("@onderwijsin/nuxt-directus-prerenderer")) {
      const syntheticPrerenderedPage = join(
        consumerDirectory,
        ".output",
        "public",
        "this-is-a-prerendered-route",
        "index.html"
      );
      if (!existsSync(syntheticPrerenderedPage))
        throw new Error(
          `Synthetic Directus prerender route was not emitted: ${syntheticPrerenderedPage}`
        );
    }
    const port = 31_000 + Math.floor(Math.random() * 1_000);
    const server = spawn("node", [".output/server/index.mjs"], {
      cwd: consumerDirectory,
      env: { ...consumerEnvironment, HOST: "127.0.0.1", PORT: String(port) },
      stdio: "inherit"
    });
    try {
      // Focused checks are the baseline for every profile. Full mode adds only
      // release-level behavior checks after this baseline has completed.
      await runFocusedAssertions(port, profile);
      if (profile.full) await runFullAssertions(port, profile);
      console.log(`External consumer ${profile.full ? "full" : "focused"} checks passed.`);
    } finally {
      await stopServer(server);
    }
  } finally {
    if (!keepConsumer) rmSync(consumerDirectory, { recursive: true, force: true });
    else console.log(`Consumer retained at ${consumerDirectory}`);
  }
}

/**
 * Stops the temporary Nitro process without leaving a child process behind.
 *
 * @param {import("node:child_process").ChildProcess} server - Running Nitro process.
 * @returns {Promise<void>} Resolves after the process exits or is forcefully terminated.
 */
async function stopServer(server) {
  if (server.exitCode !== null || server.signalCode !== null) return;
  await new Promise((resolvePromise) => {
    const forceKill = setTimeout(() => {
      if (server.exitCode === null && server.signalCode === null) server.kill("SIGKILL");
      resolvePromise();
    }, 5_000);
    server.once("exit", () => {
      clearTimeout(forceKill);
      resolvePromise();
    });
    server.kill("SIGTERM");
  });
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
