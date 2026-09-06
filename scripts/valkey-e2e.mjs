import { appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const containerName = "nuxt-modules-valkey-e2e";
const image = "valkey/valkey:8.1.10-alpine";
const port = Number(process.env.VALKEY_E2E_PORT ?? "16379");
const redisUrl = `redis://127.0.0.1:${port}`;

/**
 * Runs Docker with captured output.
 * @param {string[]} args Docker arguments.
 * @returns {string} Docker stdout.
 */
function docker(args) {
  return execFileSync("docker", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

/**
 * Removes the E2E Valkey container when it exists.
 * @returns {void}
 */
function stop() {
  try {
    docker(["rm", "--force", containerName]);
  } catch {
    // The container may not exist, which is a valid teardown state.
  }
}

/**
 * Waits briefly between Valkey readiness checks.
 * @returns {Promise<void>} A completed delay.
 */
function delay() {
  return new Promise((resolve) => setTimeout(resolve, 1_000));
}

/**
 * Starts Valkey and waits until its command interface responds with PONG.
 * @returns {Promise<void>} A promise that resolves when Valkey is ready.
 */
async function start() {
  if (!Number.isInteger(port) || port < 1 || port > 65_535)
    throw new Error(`VALKEY_E2E_PORT must be a valid TCP port; received ${port}`);

  stop();
  docker(["run", "--detach", "--publish", `${port}:6379`, "--name", containerName, image]);
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      if (docker(["exec", containerName, "valkey-cli", "ping"]).trim() === "PONG") {
        const githubEnv = process.env.GITHUB_ENV;
        if (githubEnv) appendFileSync(githubEnv, `DIRECTUS_E2E_REDIS_URL=${redisUrl}\n`);
        console.log(`Valkey is ready at ${redisUrl}`);
        return;
      }
    } catch {
      // Valkey may still be starting or the container may not be ready yet.
    }
    await delay();
  }

  try {
    console.error(docker(["logs", containerName]));
  } finally {
    stop();
  }
  throw new Error("Valkey did not become ready within 30 seconds");
}

const command = process.argv[2];
if (command === "start") await start();
else if (command === "stop") stop();
else throw new Error("Usage: node scripts/valkey-e2e.mjs <start|stop>");
