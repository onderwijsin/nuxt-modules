import { createServer, type Server } from "node:http";

export type RefreshBehavior = "success" | "transient" | "terminal";

/**
 * Controls and observes the small Directus HTTP double used by authentication E2E tests.
 */
export class MockDirectus {
  private server: Server | undefined;
  private _loginRequests = 0;
  private _refreshRequests = 0;
  private _userRequests = 0;
  private _lastItemsAuthorization: string | undefined;

  refreshBehavior: RefreshBehavior = "success";
  refreshDelayMs = 0;
  loginExpires = 1;

  /** Returns the number of login requests received by the mock.
   * @returns The login request count.
   */
  get loginRequests(): number {
    return this._loginRequests;
  }

  /** Returns the number of refresh requests received by the mock.
   * @returns The refresh request count.
   */
  get refreshRequests(): number {
    return this._refreshRequests;
  }

  /** Returns the number of current-user requests received by the mock.
   * @returns The current-user request count.
   */
  get userRequests(): number {
    return this._userRequests;
  }

  /** Returns the last authorization header received by the items endpoint.
   * @returns The last authorization header, if one was received.
   */
  get lastItemsAuthorization(): string | undefined {
    return this._lastItemsAuthorization;
  }

  /** Returns the listening mock URL.
   * @returns The mock server URL.
   */
  get url(): string {
    const address = this.server?.address();
    if (!address || typeof address === "string")
      throw new Error("Mock Directus server is not running");
    return `http://127.0.0.1:${address.port}`;
  }

  /** Resets mutable request behavior while retaining observations for assertions. */
  reset(): void {
    this.refreshBehavior = "success";
    this.refreshDelayMs = 0;
    this.loginExpires = 1;
    this._lastItemsAuthorization = undefined;
    this._userRequests = 0;
  }

  /** Starts the mock Directus server on an ephemeral localhost port. */
  async start(): Promise<void> {
    if (this.server) throw new Error("Mock Directus server is already running");

    const server = createServer(async (request, response) => {
      if (request.url?.startsWith("/items/pages")) {
        this._lastItemsAuthorization = request.headers.authorization;
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ data: [{ id: "page-1" }] }));
        return;
      }

      if (request.url?.startsWith("/auth/login")) {
        this._loginRequests += 1;
        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            data: {
              access_token: `access-${this._loginRequests}`,
              refresh_token: `refresh-${this._loginRequests}`,
              expires: this.loginExpires
            }
          })
        );
        return;
      }

      if (request.url?.startsWith("/auth/refresh")) {
        this._refreshRequests += 1;
        if (this.refreshDelayMs > 0)
          await new Promise<void>((resolve) => setTimeout(resolve, this.refreshDelayMs));
        if (this.refreshBehavior === "transient") {
          response.writeHead(500, { "content-type": "application/json" });
          response.end(
            JSON.stringify({
              errors: [
                { message: "Refresh unavailable", extensions: { code: "SERVICE_UNAVAILABLE" } }
              ]
            })
          );
          return;
        }
        if (this.refreshBehavior === "terminal") {
          response.writeHead(401, { "content-type": "application/json" });
          response.end(
            JSON.stringify({
              errors: [{ message: "Invalid token", extensions: { code: "INVALID_TOKEN" } }]
            })
          );
          return;
        }
        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            data: {
              access_token: "refreshed-access",
              refresh_token: "refreshed-refresh",
              expires: 60_000
            }
          })
        );
        return;
      }

      if (request.url?.startsWith("/auth/logout")) {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({}));
        return;
      }

      if (request.url?.startsWith("/users/me")) {
        this._userRequests += 1;
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ data: { id: "user-1", email: "user@example.test" } }));
        return;
      }

      if (
        request.url?.startsWith("/auth/password/request") ||
        request.url?.startsWith("/auth/password/reset") ||
        request.url?.startsWith("/auth/magic-links/request")
      ) {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({}));
        return;
      }

      if (request.url?.startsWith("/auth/magic-links/redeem")) {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            data: { access_token: "magic-access", refresh_token: "magic-refresh", expires: 60_000 }
          })
        );
        return;
      }

      response.writeHead(404, { "content-type": "application/json" });
      response.end(
        JSON.stringify({ errors: [{ message: "Not found", extensions: { code: "NOT_FOUND" } }] })
      );
    });

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    this.server = server;
  }

  /** Stops the mock Directus server. */
  async close(): Promise<void> {
    const server = this.server;
    this.server = undefined;
    if (!server) return;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}
