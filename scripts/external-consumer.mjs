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
 * Requests a URL, retrying while Nitro is starting.
 *
 * @param {string} url - URL to poll.
 * @param {RequestInit} [options] - Fetch options.
 * @param {number} [expectedStatus] - Expected response status; defaults to 200.
 * @returns {Promise<Response>} The first response with the expected status.
 */
async function waitForResponse(url, options = {}, expectedStatus = 200) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(2_000) });
      if (response.status === expectedStatus) return response;
    } catch {
      // Nitro is still starting.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

/**
 * Parses a JSON response and fails with a useful assertion message.
 *
 * @param {Response} response - Response to parse.
 * @param {(body: Record<string, unknown>) => boolean} assertion - Predicate for the response body.
 * @returns {Promise<Record<string, unknown>>} The parsed response body.
 */
async function readJson(response, assertion) {
  const body = await response.json();
  if (!assertion(body))
    throw new Error(`External consumer assertion failed: ${JSON.stringify(body)}`);
  return body;
}

try {
  const rootResponse = await waitForResponse(`http://127.0.0.1:${port}/`);
  const rootBody = await rootResponse.text();
  if (
    !rootBody.includes("External consumer OK") ||
    !rootBody.includes('data-sanity="static-text"') ||
    !rootBody.includes('data-sanity="template-translation"') ||
    !rootBody.includes('data-sanity="draft-form"') ||
    !rootBody.includes('data-sanity="turnstile"') ||
    !rootBody.includes("Renderer OK")
  ) {
    throw new Error("The external consumer page did not render its assertion text.");
  }

  const pingResponse = await waitForResponse(`http://127.0.0.1:${port}/api/system/ping`);
  if ((await pingResponse.text()) !== "pong")
    throw new Error("Healthcheck ping did not return pong.");

  await readJson(
    await waitForResponse(`http://127.0.0.1:${port}/api/sanity/runtime`),
    (body) =>
      body.healthcheck === true &&
      body.turnstile?.header === "x-turnstile-token" &&
      body.moduleUtils?.name === "@onderwijsin/nuxt-external-consumer" &&
      body.moduleUtils?.server === true &&
      body.publicSubpaths?.newsletterServer === true &&
      body.publicSubpaths?.rateLimitPruneTask === true &&
      body.publicSubpaths?.redirectsSource === true &&
      body.publicSubpaths?.redirectsRefreshTask === true
  );

  await readJson(
    await waitForResponse(`http://127.0.0.1:${port}/api/system/health`),
    (body) => body.data?.status === "ok"
  );

  await readJson(
    await waitForResponse(`http://127.0.0.1:${port}/api/_storage/config`, {
      headers: { "x-admin-token": "dummy-storage-token" }
    }),
    (body) => body.data?.mounts?.some((mount) => mount.mount === "cache")
  );

  await readJson(
    await waitForResponse(`http://127.0.0.1:${port}/api/sanity/redirects`, { method: "POST" }),
    (body) => body.data?.["/redirect-sanity"]?.to === "/"
  );
  const redirectResponse = await waitForResponse(
    `http://127.0.0.1:${port}/api/_redirects/%2Fredirect-sanity`,
    {},
    200
  );
  await readJson(
    redirectResponse,
    (body) => body.data?.statusCode === 302 && body.data?.to === "/"
  );

  await waitForResponse(`http://127.0.0.1:${port}/thema`);

  const manifestResponse = await waitForResponse(`http://127.0.0.1:${port}/app.webmanifest`);
  await readJson(manifestResponse, (body) => body.name === "External consumer validation");

  await waitForResponse(
    `http://127.0.0.1:${port}/api/newsletter/signup`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}"
    },
    400
  );
  console.log("External consumer sanity checks passed.");
  console.log("External consumer smoke test passed.");
} finally {
  server.kill("SIGTERM");
  if (!keepConsumer) rmSync(consumerDirectory, { recursive: true, force: true });
  else console.log(`Consumer retained at ${consumerDirectory}`);
}
