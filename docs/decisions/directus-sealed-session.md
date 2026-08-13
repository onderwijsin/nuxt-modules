# Directus sealed session

Read this decision when changing Directus session cookie sealing, key management, session format
versions, session headers, or the sealed-session playground inspection flow.

## Decision

The Directus client uses H3's public session primitives (`useSession`, `unsealSession`, and
`sealSession`) for authenticated encryption and cookie sealing. The module does not duplicate H3's
cryptographic implementation or depend on H3 internals.

The module retains a thin cookie-value wrapper because the migration contract requires the explicit
`boop1:<data>` prefix and because rotation must try multiple H3 secrets. H3 still owns the
authenticated sealing primitive and the configured cookie attributes; the module owns only the
prefix/rotation dispatch and Directus payload validation.

Directus authentication is cookie-only. H3's derived session header is disabled with
`sessionHeader: false`; callers cannot authenticate by sending `x-<cookie-name>-session`.

## Secret contract

`client.auth.sessionSecret` is required when authentication is enabled, is server-only, and must be
at least 32 characters with cryptographically random entropy. It must not be derived from the
Directus static token or exposed through public runtime configuration. `previousSessionSecrets` may
contain old secrets during rotation and is also server-only.

The shared `directusAuthSchema` keeps the field optional so `directus-config` can compose and
resolve configuration before the client module applies its environment-aware development/prepare/CI
fallback. The `directusClientOptionsSchema` is the client module's Zod boundary and rejects enabled
authentication without a secret in production-facing configuration.

The `matchedSecretSlot` field is authenticated metadata identifying the configured secret slot that
opened the payload (`active` or a configured `previous-N` slot). It is not used to select or trust a
key; verification still tries the configured secrets and the payload is accepted only after H3
authentication and Zod validation. The slot label is diagnostic, not a stable key identifier; the
order of previous secrets may change without affecting decryption or rotation.

## Rotation and migration

New sessions are always sealed with the active secret. Reads try the active secret followed by
configured previous secrets. A session opened with a previous secret is validated and resealed with
the active secret. Removing a previous secret invalidates sessions still using it.

Operationally, rotate in two stages: deploy the new active secret while retaining the old secret in
`previousSessionSecrets` on every instance, then remove the old secret after at least the configured
cookie `maxAge` plus a short rolling-deployment window. Keep the shared Nitro storage mount
protected during the overlap because sealed refresh results from the previous deployment may remain
until their short TTL expires.

The cookie value uses the explicit version prefix `boop1:<data>`. The authenticated session data
also includes format version `1` and key metadata. Legacy unsigned base64url JSON cookies and
cookies without the `boop1:` prefix are never accepted as trusted data and are cleared. Future
format changes must add an explicit migration path or invalidate the older format; they must not
silently reinterpret untrusted data.

## Runtime boundaries

The complete session contains access and refresh tokens but remains in server runtime code. Only the
token-free user snapshot enters Nuxt application state. Invalid, expired, tampered, wrong-key, and
schema-invalid cookies fail closed. Sealed values are bounded by the Directus cookie-size guard and
are never logged. Refresh coordination stores H3-sealed session values rather than plaintext token
pairs, while the configured Nitro storage backend remains sensitive infrastructure.

Directus remains the authorization boundary. The session snapshot is for request credential
selection and UI state, not application-side permission decisions.

## Playground

The Directus playground has a diagnostic endpoint and page that render both the sealed cookie and
the server-decrypted session. `client.auth.maskSecretsInPlayground` defaults to `true`, masking
access and refresh tokens before returning them to the browser. Developers may explicitly disable
masking in the local playground, which is not a production feature.
