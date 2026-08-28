# Decision: Execute Directus authentication directly during SSR

- **Status:** Accepted
- **Date:** 2026-08-28
- **Scope:** Directus authentication composable, Nitro authentication handlers, and SSR runtime
  behavior

## Context

`useDirectusAuth()` is used in both browser code and server-rendered pages or middleware. The
browser implementation can call the module's `/_directus/auth` proxy routes with relative URLs, but
the same relative URLs cannot be resolved by server-side `fetch`. Resolving them to an absolute
application URL introduced a second problem: an SSR-generated internal POST has no browser `Origin`
or `Referer` header, so the public route correctly rejects it with the module's CSRF check.

The authentication operations also have different security boundaries. Browser requests are
untrusted public requests and need CSRF and, where configured, Turnstile validation. A server-side
call originating inside the Nuxt application is already inside the trusted request boundary and
should not manufacture browser metadata or invoke browser bot protection.

## Decision

The authentication composable has explicit client and server branches for every operation:

- In the browser, operations continue to call the same-origin `/_directus/auth` proxy handlers.
- During SSR, operations call request-bound server utilities through the existing server-auth Nuxt
  plugin's `$directusAuthServer` injection.
- The server utilities contain the shared Directus request and session logic. Public HTTP handlers
  validate their request body and enforce CSRF and Turnstile at the HTTP boundary before calling
  those utilities.
- SSR server utilities do not run CSRF or Turnstile validation. They use the current H3 event for
  Directus requests, session cookies, and response updates.
- The server injection is typed with an explicit `DirectusAuthServer` interface. Its methods are
  bound to the current event and therefore expose only operation inputs, not the H3 event itself.

No application base URL or custom URL resolver is required for authentication. SSR does not make an
internal HTTP request, so it does not need to construct an absolute URL for a proxy route.

## Implementation

The implementation follows this flow:

1. The server-auth plugin obtains the current request event and creates the request-bound
   `$directusAuthServer` operations.
2. The composable checks `import.meta.server` at the start of each operation.
3. The server branch calls the corresponding injected operation and updates the same token-free
   session state and authentication hooks as the browser branch.
4. The browser branch calls the existing proxy endpoint with browser metadata such as a Turnstile
   token when applicable.
5. The proxy handler validates CSRF, validates the body, validates Turnstile where configured, and
   delegates the actual Directus/session work to the server utility.

Server-only utilities use Nitro's request-aware `useRuntimeConfig(event)` rather than Nuxt's ambient
`#imports` version. The server bridge may be called from asynchronous page middleware after Nuxt's
composable context has been suspended; configuration and session operations must therefore be
resolved from the H3 event, not from ambient Nuxt context. Consumer code does not need to wrap the
call in `runWithContext()`.

The utility layer is deliberately shared by the server plugin and HTTP handlers so the two entry
points cannot drift in Directus payloads, configured redirect URLs, session establishment, or error
behavior.

## Alternatives considered

- **Resolve proxy paths to an absolute application URL:** rejected because it still creates an
  internal HTTP request and the generated SSR request has no browser origin metadata.
- **Use `useRequestFetch()` for SSR proxy calls:** rejected because it would preserve the internal
  HTTP hop and still require the request to satisfy a browser-oriented CSRF boundary.
- **Bypass CSRF for requests that appear internal:** rejected because it weakens a public HTTP
  boundary and creates a difficult-to-audit exception.
- **Run Turnstile in the SSR bridge:** rejected because Turnstile protects untrusted browser
  mutations; trusted server-side application calls do not have a browser token to validate.
- **Duplicate Directus logic in the plugin:** rejected because handler and SSR behavior could
  diverge. Both entry points delegate to the shared server utilities.

## Testing and regression prevention

The contract is covered at three layers:

- Unit tests cover every server utility operation, including Directus URLs, payloads, configured
  redirect values, session delegation, and invalid refresh behavior.
- Composable tests cover every browser branch, including state transitions, hooks, Turnstile
  metadata, disabled magic links, and failures.
- Nuxt E2E tests start a local mocked Directus HTTP instance and exercise SSR middleware calling the
  composable. In particular, initial SSR magic-link redemption is tested without `Origin` or
  `Referer` headers, proving that it bypasses the public proxy route while still reaching Directus.

The public handlers retain tests for missing and cross-origin request metadata. This keeps the
security boundary strict while preventing SSR-only calls from being forced through it.

## Consequences

SSR authentication no longer depends on URL resolution, application host configuration, or an
internal network request. It also avoids false CSRF failures during page middleware and keeps
Directus requests request-scoped.

Using Nitro's event-bound runtime configuration adds a small server-runtime constraint: utilities
that participate in this bridge must receive and use the current H3 event for request-specific
configuration.

The server bridge is intentionally not a public HTTP API. It must remain available only through
Nuxt's server runtime, and future server-side authentication operations must preserve the
distinction between trusted server calls and untrusted browser proxy requests.

The browser and SSR paths have separate transport implementations, so every new authentication
operation must be added to both branches and to the shared server utility boundary.

## Reconsideration criteria

Revisit this decision if Nuxt provides a supported internal request mechanism that preserves the
same request context and security guarantees without an HTTP hop, or if the authentication API needs
to be callable from an external service rather than the current Nuxt request.
