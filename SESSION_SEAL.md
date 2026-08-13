# Directus sealed session implementation plan

Issue: [#144](https://github.com/onderwijsin/nuxt-modules/issues/144)

Upstream references: [H3 security utilities](https://h3.dev/raw/utils/security.md) and
[H3 session example](https://h3.dev/raw/examples/handle-session.md).

This plan covers authenticated encryption for the Directus auth session cookie, H3 session utility
reuse, playground inspection, tests, documentation, and release versioning. No implementation is
included in this document.

## Decisions confirmed by upstream H3 review

H3's session utilities are suitable for the cryptographic and cookie-management foundation:

- `useSession`, `getSession`, `updateSession`, `clearSession`, `sealSession`, and
  `unsealSession` provide authenticated encryption/signing, expiry handling, and cookie handling.
- H3 uses a `password` with a minimum recommended entropy of 32 characters. The secret is the
  security boundary and must be generated from a cryptographically secure random source.
- The existing `h3` dependency is already present, so this does not require a new runtime
  dependency or a second encryption implementation.
- The existing Directus cookie name maps naturally to H3's `name` option.
- The derived header name is configurable through H3's `sessionHeader` option. It defaults to
  `x-${name.toLowerCase()}-session`, and can be disabled with `false`. The implementation will set
  `sessionHeader: false` unless there is a deliberate reason to accept a credential-bearing
  session header. Directus authentication should remain cookie-based and same-origin.
- H3 supports cookie chunking through the session cookie options. The implementation must still
  preserve the Directus bounded-session guard and test the effective browser-cookie limits.

The implementation will use H3 primitives for sealing/unsealing and its established session
format, while keeping Directus-specific validation, token ownership, snapshot shape, migration
handling, and cookie policy in the module. It will not copy H3's encryption algorithm or internal
crypto code.

## Configuration

Extend the shared Directus auth configuration with server-only sealing settings under `client.auth`.
The exact public names will be finalized against the existing schema conventions, but the contract
will include:

- one required active session secret when auth is enabled;
- optional previous secrets for staged rotation;
- an application/session format version or key identifier for future migrations;
- `maskSecretsInPlayground`, defaulting to `true`.

The secret and previous secrets must remain in private runtime configuration. They must not be
copied into `runtimeConfig.public`, generated client declarations, browser state, logs, or error
messages. Production auth setup without usable key material must fail clearly. Auth-disabled setups
must not require or use the secret.

`maskSecretsInPlayground` is a development demonstration control, not a security boundary. The
playground will default to masking access and refresh tokens, while allowing the local developer to
disable masking when they explicitly want to inspect the complete decrypted session.

## Session implementation

Replace the current base64url JSON serializer with an H3-backed sealed session wrapper.

The wrapper will:

1. Store the complete Directus session, including tokens and expiry, as server-only H3 session data.
2. Validate the decrypted data with the existing Zod schema before it is trusted.
3. Include an authenticated application format version and key metadata in the session data.
4. Use a fresh nonce/IV through H3 for every seal operation.
5. Preserve the existing cookie name, `httpOnly`, `secure`, `sameSite`, `path`, `domain`, and
   `maxAge` behavior.
6. Reject malformed, legacy unsigned, truncated, tampered, expired, wrong-key, and schema-invalid
   values without uncontrolled exceptions.
7. Clear invalid cookies where the request/response lifecycle allows it.
8. Preserve the existing refresh, logout, and cookie-size failure behavior.

Legacy unsigned cookies will never be accepted as trusted sessions. They will be treated as invalid
and cleared, causing users to authenticate again.

## Key rotation

Initial rotation support will use one active secret and zero or more previous secrets:

1. New sessions are always sealed with the active secret.
2. Reads first attempt the active secret, then each configured previous secret in order.
3. A session successfully opened with a previous secret is validated and then resealed with the
   active secret on the next response, or explicitly during the next session update.
4. Previous secrets remain configured for the overlap period needed to migrate existing cookies.
5. Removing a previous secret intentionally invalidates cookies still sealed with it.
6. The authenticated session version/key metadata records which format/key generation was used,
   so future migrations can distinguish payload changes from key changes.

The implementation will avoid exposing key identifiers as an unauthenticated routing mechanism.
If H3's public API cannot support trying multiple secrets without duplicating its internal crypto or
causing an empty session to overwrite a valid previous-key cookie, the first release will support a
single active secret plus a versioned migration seam and document rotation as an explicit logout
boundary. That fallback must not weaken verification or accept legacy plaintext cookies.

## Playground expansion

Add a playground-only Nitro endpoint and page for session inspection.

The endpoint will:

- read the configured Directus auth cookie;
- decrypt it using the same H3-backed session contract as the module;
- return the encrypted cookie value/length and the decrypted session representation;
- report absent, invalid, legacy, expired, and tampered-cookie states safely;
- apply `maskSecretsInPlayground` before returning data to the browser.

The page will render both encrypted and decrypted data, including the session version/key metadata,
cookie length, token fields, expiry, and user snapshot. With the default option, access and refresh
tokens will be masked. When masking is disabled in the local playground configuration, the complete
decrypted data may be rendered because this playground is explicitly development-only and will not
be shipped as a production feature.

The page will clearly label the endpoint as diagnostic-only and will not add a consumer-facing
module API solely for playground inspection.

## Testing strategy

### Session unit tests

Add focused tests for:

- seal/decrypt round trips;
- different sealed values for identical sessions;
- tampered ciphertext;
- tampered authentication tag or envelope;
- malformed and truncated values;
- wrong active key;
- expired and schema-invalid sessions;
- oversized sealed sessions;
- rejection and clearing of legacy unsigned cookies;
- session version validation;
- previous-key reads and active-key resealing if rotation is implemented;
- preservation of cookie attributes and clear behavior.

### Configuration tests

Cover:

- required secret validation when auth is enabled;
- auth-disabled behavior without a secret;
- private/public runtime-config separation;
- previous-secret validation;
- `maskSecretsInPlayground` defaulting to `true` and accepting explicit `false`;
- direct module options and shared `directus.config.ts` resolution.

### Nuxt integration and E2E tests

Extend the existing Directus fixture to verify:

- login creates a sealed cookie rather than base64url JSON;
- login, session hydration, refresh, and logout retain current behavior;
- malformed/tampered/legacy cookies fail closed;
- a previous key can be migrated to the active key when supported;
- the diagnostic endpoint returns encrypted data plus a safe decrypted projection;
- playground masking is enabled by default and can be disabled locally.

Tests must assert behavior and boundaries rather than H3 implementation details.

## Documentation and decisions

Create a new decision record, separate from `docs/decisions/directus-session-auth.md`:

`docs/decisions/directus-sealed-session.md`

It will document the decision to use H3's public session primitives, the disabled/default session
header policy, secret requirements, sealed payload/versioning, rotation behavior, legacy-cookie
handling, and the Directus authorization boundary. The existing Directus session-auth decision will
be updated only where necessary to point to this more specific decision and remove contradictory
plain-cookie statements.

Update the affected consumer and maintainer surfaces:

- `modules/directus-client/README.md`;
- `skills/nuxt-directus-client/SKILL.md`;
- Directus configuration documentation and its matching consumer skill;
- the new sealed-session decision record;
- the package changelog through the normal release process, not by manually fabricating generated
  release output.

Documentation will cover secret generation, private deployment storage, production failure
behavior, migration invalidation, rotation overlap, header handling, and playground masking.

## Release/versioning

This changes the auth cookie format and adds a required configuration contract for enabled auth. It
is intentionally allowed to invalidate existing sessions because this package is not yet installed
in production projects, while the sealed format and explicit version metadata preserve a migration
path for future releases.

Create one Changeset per affected public-package concern. The expected scope is:

- a minor release for `@onderwijsin/nuxt-directus-client` for sealed runtime behavior and options;
- a separate minor release for `@onderwijsin/nuxt-directus-config` if its shared schema/options are
  changed.

No dependency addition is expected. The existing exact-catalog `h3` dependency will be reused.

## Validation gates

Run focused tests during implementation, then the repository gates:

```text
corepack pnpm format
corepack pnpm lint:fix
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm validate:packages
```

Also run Directus-specific preparation, tests, and playground validation, including playground
typecheck/build and packed-package validation where the changed runtime exports or dependency
classification require it. Review the final diff for secret exposure, generated files, public API
documentation, decision synchronization, and correctly scoped Changesets.
