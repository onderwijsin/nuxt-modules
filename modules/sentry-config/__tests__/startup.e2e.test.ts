import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { resolveFixture } from "../../../packages/test-utils/src";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const readySchema = z.object({
  initializations: z.number(),
  release: z.string(),
  sendDefaultPii: z.boolean(),
  enableLogs: z.boolean()
});

describe("Sentry CLI development startup", () => {
  it("starts cold and cached workers with one preload and one captured error", async () => {
    const fixture = resolveFixture(import.meta.url, "startup");
    const temporary = await mkdtemp(join(fixture, ".startup-"));
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const listener = createServer();
        listener.listen(0, "127.0.0.1");
        await once(listener, "listening");
        const address = listener.address();
        if (!address || typeof address === "string") throw new Error("No test port available");
        const port = address.port;
        listener.close();
        await once(listener, "close");
        const server = spawn(
          "node",
          [
            join(root, "node_modules/nuxt/bin/nuxt.mjs"),
            "dev",
            fixture,
            "--port",
            String(port),
            "--host",
            "127.0.0.1",
            "--no-fork"
          ],
          {
            cwd: root,
            env: {
              ...process.env,
              NUXT_BUILD_DIR: join(temporary, ".nuxt"),
              NUXT_APP_BUILD_ID: "sentry-startup-regression",
              NUXT_TELEMETRY_DISABLED: "1",
              NO_COLOR: "1"
            },
            stdio: ["ignore", "pipe", "pipe"]
          }
        );
        let output = "";
        server.stdout.on("data", (chunk) => {
          output += chunk.toString();
        });
        server.stderr.on("data", (chunk) => {
          output += chunk.toString();
        });
        try {
          await expect
            .poll(
              async () => {
                if (server.exitCode !== null) throw new Error(output);
                const response = await fetch(`http://127.0.0.1:${port}/readyz`);
                return readySchema.parse(await response.json());
              },
              { timeout: 45_000, interval: 200 }
            )
            .toEqual({
              initializations: 1,
              release: "sentry-startup-regression",
              sendDefaultPii: false,
              enableLogs: true
            });
          const response = await fetch(`http://127.0.0.1:${port}/capture`, {
            method: "POST",
            headers: {
              authorization: "Bearer SENTRY_AUTH_SENTINEL",
              cookie: "session=SENTRY_COOKIE_SENTINEL",
              "x-forwarded-for": "203.0.113.39"
            }
          });
          const { envelopes } = z
            .object({ envelopes: z.array(z.string()) })
            .parse(await response.json());
          const errors = envelopes.filter((envelope) =>
            envelope.includes("SENTRY_CONTROLLED_ERROR")
          );
          expect(errors).toHaveLength(1);
          expect(errors[0]).toContain("/capture");
          expect(errors[0]).not.toContain('"ip_address"');
          expect(errors[0]).not.toMatch(/SENTRY_(AUTH|COOKIE)_SENTINEL/u);
          const entry = await readFile(join(temporary, ".nuxt/dev/index.mjs"), "utf8");
          expect(
            entry.match(
              /from ['"]\.\/sentry\.server\.config\.mjs['"]|import ['"]\.\/sentry\.server\.config\.mjs['"]/gu
            )
          ).toHaveLength(1);
          expect(output).not.toMatch(/worker exited|unhandledRejection/u);
        } finally {
          if (server.exitCode === null && server.signalCode === null) {
            const exited = once(server, "exit");
            server.kill("SIGTERM");
            const timer = setTimeout(() => server.kill("SIGKILL"), 5000);
            await exited;
            clearTimeout(timer);
          }
        }
      }
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  }, 150_000);
});
