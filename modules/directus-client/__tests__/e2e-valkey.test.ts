import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { setupFixture, useTestContext } from "../../../packages/test-utils/src";
import { MockDirectus } from "./helpers/mock-directus";

const redisUrl = process.env.DIRECTUS_E2E_REDIS_URL;

interface NitroProcess {
  readonly child: ChildProcess;
  readonly url: string;
  readonly output: string[];
}

async function getFreePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not allocate a free port");
  const { port } = address;
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
  return port;
}

async function startNitro(outputDir: string, port: number): Promise<NitroProcess> {
  const child = spawn(process.execPath, [`${outputDir}/server/index.mjs`], {
    env: { ...process.env, HOST: "127.0.0.1", NODE_ENV: "test", PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"]
  });
  const output: string[] = [];
  child.stdout?.on("data", (chunk: Buffer) => output.push(chunk.toString()));
  child.stderr?.on("data", (chunk: Buffer) => output.push(chunk.toString()));

  const endpoint = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null)
      throw new Error(`Nitro process exited during startup:\n${output.join("")}`);
    try {
      await fetch(`${endpoint}/_directus/auth/session`);
      return { child, url: endpoint, output };
    } catch {
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`Nitro process did not become ready:\n${output.join("")}`);
}

async function stopNitro(processInfo: NitroProcess): Promise<void> {
  if (processInfo.child.exitCode !== null) return;
  await new Promise<void>((resolve) => {
    processInfo.child.once("exit", () => resolve());
    processInfo.child.kill("SIGTERM");
  });
}

function getSessionCookie(response: Response): string | undefined {
  return response.headers.get("set-cookie")?.split(";", 1)[0];
}

describe.skipIf(!redisUrl)("Directus client with Valkey refresh coordination", async () => {
  const upstream = new MockDirectus();
  const originalUrl = process.env.DIRECTUS_E2E_URL;
  const originalBase = process.env.DIRECTUS_E2E_REDIS_BASE;
  let processA: NitroProcess | undefined;
  let processB: NitroProcess | undefined;

  afterAll(async () => {
    await Promise.all([
      processA ? stopNitro(processA) : Promise.resolve(),
      processB ? stopNitro(processB) : Promise.resolve(),
      upstream.close()
    ]);
    if (originalUrl === undefined) delete process.env.DIRECTUS_E2E_URL;
    else process.env.DIRECTUS_E2E_URL = originalUrl;
    if (originalBase === undefined) delete process.env.DIRECTUS_E2E_REDIS_BASE;
    else process.env.DIRECTUS_E2E_REDIS_BASE = originalBase;
  });

  await upstream.start();
  process.env.DIRECTUS_E2E_URL = upstream.url;
  process.env.DIRECTUS_E2E_REDIS_BASE = `directus-e2e-${process.pid}`;
  await setupFixture(import.meta.url, "basic", { dev: false, server: false, build: true });

  beforeAll(async () => {
    const nuxt = useTestContext().nuxt;
    if (!nuxt) throw new Error("Nuxt test context is unavailable");
    const outputDir = nuxt.options.nitro.output.dir;
    processA = await startNitro(outputDir, await getFreePort());
    processB = await startNitro(outputDir, await getFreePort());
  });

  function getServers(): [NitroProcess, NitroProcess] {
    if (!processA || !processB) throw new Error("Nitro processes did not start");
    return [processA, processB];
  }

  function requestSession(server: NitroProcess, cookie: string): Promise<Response> {
    return fetch(`${server.url}/_directus/auth/session`, { headers: { cookie } });
  }

  async function loginWithAccessToken(expires = 1): Promise<string> {
    upstream.loginExpires = expires;
    const [serverA] = getServers();
    const response = await fetch(`${serverA.url}/_directus/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: serverA.url,
        "x-turnstile-token": "directus-login"
      },
      body: JSON.stringify({ email: "user@example.test", password: "password" })
    });
    expect(response.status, await response.clone().text()).toBe(200);
    const cookie = getSessionCookie(response);
    if (!cookie) throw new Error("Login did not write a Directus session cookie");
    await new Promise<void>((resolve) => setTimeout(resolve, 5));
    return cookie;
  }

  beforeEach(() => upstream.reset());

  it("coordinates one refresh across two independent Nitro processes", async () => {
    const [serverA, serverB] = getServers();
    const staleCookie = await loginWithAccessToken(1);
    const refreshCountBefore = upstream.refreshRequests;
    upstream.refreshDelayMs = 250;

    const [first, second] = await Promise.all([
      requestSession(serverA, staleCookie),
      requestSession(serverB, staleCookie)
    ]);
    expect(first.status, await first.clone().text()).toBe(200);
    expect(second.status, await second.clone().text()).toBe(200);
    await expect(first.json()).resolves.toMatchObject({ userId: "user-1" });
    await expect(second.json()).resolves.toMatchObject({ userId: "user-1" });
    expect(upstream.refreshRequests).toBe(refreshCountBefore + 1);
    const firstCookie = getSessionCookie(first);
    const secondCookie = getSessionCookie(second);
    expect(firstCookie).toBeTruthy();
    expect(secondCookie).toBe(firstCookie);
    expect(firstCookie).not.toBe(staleCookie);
  });

  it("reuses a completed result across processes", async () => {
    const [serverA, serverB] = getServers();
    const staleCookie = await loginWithAccessToken(1);
    const refreshCountBefore = upstream.refreshRequests;
    const first = await requestSession(serverA, staleCookie);
    expect(first.status, await first.clone().text()).toBe(200);
    const rotatedCookie = getSessionCookie(first);
    expect(rotatedCookie).toBeTruthy();

    const second = await requestSession(serverB, staleCookie);
    expect(second.status, await second.clone().text()).toBe(200);
    expect(upstream.refreshRequests).toBe(refreshCountBefore + 1);
    expect(getSessionCookie(second)).toBe(rotatedCookie);
  });

  it("shares transient failures and recovers after their TTL", async () => {
    const [serverA, serverB] = getServers();
    const staleCookie = await loginWithAccessToken(1);
    const refreshCountBefore = upstream.refreshRequests;
    upstream.refreshBehavior = "transient";
    upstream.refreshDelayMs = 250;
    const [first, second] = await Promise.all([
      requestSession(serverA, staleCookie),
      requestSession(serverB, staleCookie)
    ]);
    expect(first.status, await first.clone().text()).toBe(503);
    expect(second.status, await second.clone().text()).toBe(503);
    expect(upstream.refreshRequests).toBe(refreshCountBefore + 1);
    expect(first.headers.get("set-cookie") ?? "").not.toContain("directus_session=");
    expect(second.headers.get("set-cookie") ?? "").not.toContain("directus_session=");

    upstream.refreshBehavior = "success";
    const immediateRetry = await requestSession(serverB, staleCookie);
    expect(immediateRetry.status, await immediateRetry.clone().text()).toBe(503);
    expect(upstream.refreshRequests).toBe(refreshCountBefore + 1);
    await new Promise<void>((resolve) => setTimeout(resolve, 1_100));
    const recovered = await requestSession(serverA, staleCookie);
    expect(recovered.status, await recovered.clone().text()).toBe(200);
    expect(upstream.refreshRequests).toBe(refreshCountBefore + 2);
    expect(getSessionCookie(recovered)).toBeTruthy();
  });

  it("shares terminal rejection and clears both sessions", async () => {
    const [serverA, serverB] = getServers();
    const staleCookie = await loginWithAccessToken(1);
    const refreshCountBefore = upstream.refreshRequests;
    upstream.refreshBehavior = "terminal";
    upstream.refreshDelayMs = 250;
    const [first, second] = await Promise.all([
      requestSession(serverA, staleCookie),
      requestSession(serverB, staleCookie)
    ]);
    expect(upstream.refreshRequests).toBe(refreshCountBefore + 1);
    for (const response of [first, second]) {
      expect(response.status, await response.clone().text()).toBe(204);
      await expect(response.text()).resolves.toBe("");
      expect(response.headers.get("set-cookie")).toMatch(
        /directus_session=;.*(?:Max-Age=0|Expires=Thu, 01 Jan 1970)/
      );
    }
  });
});
