# PR #289 final follow-up — fix asset-cache pruning namespace and complete E2E

## Execution instructions

You are working in `onderwijsin/nuxt-modules` on branch `feat/cache-prune`, PR #289 (`feat(directus-client): prune stale asset cache entries`), based on `fix/asset-handlers`.

This brief is the design. Execute it exactly. Do not make alternate architectural choices unless the repository proves a stated API is unavailable. If that happens, stop and report the concrete incompatibility instead of inventing another normalization algorithm.

Before the final implementation commit, remove this task file:

```text
.agents/tasks/pr-289-cache-pruning-follow-up.md
```

Do not leave temporary diagnostics, debug routes, console logging, or this brief in the final tree.

---

## 1. Scope

PR #289 adds opt-in cleanup of stale Directus asset-cache entries for storage backends that do not physically enforce TTL.

The feature already has the right architecture and public API. Do **not** redesign it.

Existing runtime structure should remain:

```text
modules/directus-client/src/runtime/assets/
  cache.ts
  cached-handler.ts
  prune.ts
  prune-coordinator.ts

modules/directus-client/src/runtime/tasks/
  prune.ts
```

Existing public prune config remains:

```ts
prune: {
  enabled: boolean;
  onRequest: boolean;
  interval: number;
}
```

Resolved defaults remain:

```ts
{
  enabled: false,
  onRequest: true,
  interval: 3600
}
```

Do not reintroduce task config (`task.enabled`, `task.schedule`) or automatic Nitro task registration/scheduling.

This follow-up is specifically about:

1. fixing real cache namespace enumeration exposed by the new filesystem E2E;
2. removing manual cache-key normalization/reconstruction;
3. making unit tests derive the namespace from ocache rather than from our own assumption;
4. hardening the E2E so it waits for asynchronous cache writes as well as deletion;
5. preserving all existing pruning semantics.

---

## 2. Real bug discovered by E2E

The new filesystem-backed E2E proved a production integration mismatch.

The fixture successfully:

- starts real Nitro;
- serves deterministic upstream assets;
- writes cache data to a real filesystem-backed Nitro storage mount;
- resolves the expected prune config;
- uses a driver with no native TTL flag.

Physical/logical cache keys exist, but pruning reports:

```text
scanned: 0
```

Calling the prune utility directly against the same real storage also returns zero scanned entries.

Therefore this is **not** a timing, `waitUntil`, coordinator, or Nitro-task problem. The failure is namespace enumeration.

---

## 3. Root cause: ocache owns cache-key construction

The Directus asset cache uses these module-owned constants:

```ts
DIRECTUS_ASSET_CACHE_BASE = "/cache";
DIRECTUS_ASSET_CACHE_GROUP = "handlers";
DIRECTUS_ASSET_CACHE_NAME = "directus-assets";
```

Those constants are correct and should remain the shared source of truth.

The mistake is assuming the actual storage namespace is simply:

```text
/cache:handlers:directus-assets:
```

It is not.

Pinned `ocache` 0.3.0 constructs keys with its own `buildCacheKey()` and `escapeKeySegment()` logic. For each `group` and `name` segment, it removes unsupported punctuation and, when a segment changes, appends a hash so the transformation is not lossy.

Conceptually:

```text
directus-assets
```

becomes:

```text
directusassets.<hash>
```

not merely `directusassets`, and not the raw `directus-assets` string.

After ocache constructs the key, Unstorage performs its own normalization (separator normalization, leading/trailing separator handling, etc.). The filesystem driver then maps `:` separators to directories internally.

These are different layers. Our module must not reproduce either transformation.

---

## 4. Remove the current manual fallback completely

Current `prune.ts` contains an attempted workaround similar to:

```ts
export const DIRECTUS_ASSET_CACHE_PREFIX =
  `${DIRECTUS_ASSET_CACHE_BASE}:${DIRECTUS_ASSET_CACHE_GROUP}:${DIRECTUS_ASSET_CACHE_NAME}:`;

const DIRECTUS_ASSET_CACHE_NORMALIZED_PREFIX =
  `${DIRECTUS_ASSET_CACHE_BASE.replaceAll("/", "")}:` +
  `${DIRECTUS_ASSET_CACHE_GROUP}:` +
  `${DIRECTUS_ASSET_CACHE_NAME.replace(/\W/g, "")}.`;
```

and then does multiple `getKeys()` calls, fallback logic, array merging, and manual `startsWith()` filtering.

Delete that approach.

Specifically remove:

- `DIRECTUS_ASSET_CACHE_NORMALIZED_PREFIX`;
- manual `.replaceAll("/", "")` for namespace construction;
- manual `.replace(/\W/g, "")` for namespace construction;
- fallback `getKeys()` calls;
- `Set` merging of primary/fallback results;
- manual namespace `startsWith()` post-filtering;
- any attempt to calculate ocache's hash ourselves;
- any copied ocache hash/escape implementation.

Do **not** deep-import ocache internals such as `escapeKeySegment` or private source paths.

---

## 5. Required solution: public `ocache.resolveCacheKeys()`

Pinned `ocache` 0.3.0 publicly exports `resolveCacheKeys` from the package root.

Use that API.

`resolveCacheKeys()` uses the same internal cache-key builder that the actual cached handler uses. This delegates all of the following to ocache:

- base handling;
- group escaping;
- name escaping;
- segment hash suffixes;
- cache-key assembly.

This is the required abstraction boundary.

---

## 6. Add `resolveAssetCacheStoragePrefix()` in `cache.ts`

Modify:

```text
modules/directus-client/src/runtime/assets/cache.ts
```

Import `resolveCacheKeys` from the public package root:

```ts
import { resolveCacheKeys } from "ocache";
```

Keep the existing shared constants:

```ts
export const DIRECTUS_ASSET_CACHE_BASE = "/cache";
export const DIRECTUS_ASSET_CACHE_GROUP = "handlers";
export const DIRECTUS_ASSET_CACHE_NAME = "directus-assets";
```

Add one private deterministic probe key:

```ts
const ASSET_CACHE_NAMESPACE_PROBE = "__namespace_probe__";
```

Add this exported helper in `cache.ts`:

```ts
export async function resolveAssetCacheStoragePrefix(): Promise<string> {
  const [key] = await resolveCacheKeys({
    options: {
      base: DIRECTUS_ASSET_CACHE_BASE,
      group: DIRECTUS_ASSET_CACHE_GROUP,
      name: DIRECTUS_ASSET_CACHE_NAME,
      getKey: () => ASSET_CACHE_NAMESPACE_PROBE
    }
  });

  if (!key) {
    throw new Error("Could not resolve Directus asset cache storage namespace");
  }

  const separator = key.lastIndexOf(":");
  if (separator < 0) {
    throw new Error("Could not resolve Directus asset cache storage namespace");
  }

  return key.slice(0, separator + 1);
}
```

Do not export the probe constant.

The intended result is conceptually:

```text
ocache generates:
/cache:handlers:directusassets.<hash>:__namespace_probe__.json

helper returns:
/cache:handlers:directusassets.<hash>:
```

This small removal of the terminal segment is acceptable because ocache 0.3.0 does not expose a dedicated `resolveCachePrefix()` API.

Do not manipulate `base`, `group`, or `name` manually anywhere else.

---

## 7. Do not manually use Unstorage normalization helpers

Unstorage exposes helpers such as `normalizeKey`, `normalizeBaseKey`, and `joinKeys`.

Do **not** add or use them here.

Do not add `unstorage` as a new direct dependency solely for this feature.

Reason:

- `storage.getKeys(prefix)` already normalizes its base internally;
- item operations normalize keys internally;
- Nitro `useStorage("directus-assets")` already returns a `prefixStorage()` view over the mounted storage.

Required ownership is:

```text
ocache
  -> constructs cache keys

Nitro useStorage()
  -> exposes mounted storage

Unstorage
  -> normalizes and scopes keys

filesystem/redis/kv driver
  -> owns physical representation
```

Our module should not duplicate any of these transformations.

---

## 8. Simplify `prune.ts` enumeration to one call

Modify:

```text
modules/directus-client/src/runtime/assets/prune.ts
```

Import:

```ts
resolveAssetCacheStoragePrefix
```

from `./cache`.

The namespace enumeration must reduce to:

```ts
const storage = useStorage(config.storage);
const prefix = await resolveAssetCacheStoragePrefix();
const keys = await storage.getKeys(prefix);
```

That is the complete namespace-discovery logic.

Do not:

- call `getKeys()` twice;
- apply fallback prefixes;
- merge key arrays;
- manually normalize returned keys;
- apply a second `startsWith()` namespace filter.

`storage.getKeys(prefix)` itself is the namespace boundary.

Remove `DIRECTUS_ASSET_CACHE_PREFIX` if it exists only to drive pruning/tests. Keep only the base/group/name constants that define the actual cache configuration.

---

## 9. Keep all reads/deletes through the existing ocache blob adapter

Do not change `createAssetCacheStorage(config.storage)`.

Pruning must continue to use the ocache blob adapter for actual entry access and deletion.

Required behavior remains:

```text
cacheStorage.get(key) throws
  -> skipped

cacheStorage.get(key) returns null
  -> remove

decoded but structurally unusable entry
  -> remove

expired entry
  -> remove

valid unexpired entry
  -> retain

cacheStorage.set(key, null) throws
  -> skipped
```

Do not inspect files directly in runtime code.
Do not use filesystem mtimes.
Do not decode ocache blob framing manually.

---

## 10. Preserve malformed-entry validation

The current structural validation added in the previous follow-up is correct.

Keep behavior equivalent to:

```ts
function isUsableAssetCacheValue(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.status !== 200) return false;
  if (!isRecord(value.headers)) return false;

  return isString(value.body) || ArrayBuffer.isView(value.body);
}
```

Do not expand this into a copy of ocache's full HTTP validator.

The purpose is simply to prevent decoded-but-useless cache garbage from living forever, especially under unbounded SWR.

---

## 11. Preserve lifetime semantics exactly

Do not regress existing expiry behavior.

Required semantics:

### `maxAge: 0`

Immediately expired:

```ts
if (maxAge === 0) return "expired";
```

### Non-SWR

Expired only when:

```ts
age > maxAge * 1000
```

not `>=`.

### Finite SWR

Expired only when:

```ts
age > (maxAge + staleMaxAge) * 1000
```

### Unbounded SWR

If no effective `staleMaxAge` exists, a valid entry is physically retained indefinitely.

### Per-entry overrides

Stored `maxAge`/`staleMaxAge` override configured values when valid.

### Invalid present lifetime metadata

Treat as malformed and remove.

Keep the existing tests for all of these semantics.

---

## 12. Fix unit tests so they no longer hardcode the wrong namespace

Modify:

```text
modules/directus-client/__tests__/asset-prune.test.ts
```

Current tests construct keys from a manually assumed prefix, for example:

```ts
`${DIRECTUS_ASSET_CACHE_PREFIX}entry.json`
```

That is why the namespace bug escaped unit coverage: the test created keys using the same incorrect assumption that pruning used.

Change unit tests to import:

```ts
resolveAssetCacheStoragePrefix
```

from:

```text
../src/runtime/assets/cache
```

Resolve the prefix from ocache and use that value when constructing test entries.

Preferred shape:

```ts
const assetCachePrefix = await resolveAssetCacheStoragePrefix();
```

Then:

```ts
`${assetCachePrefix}entry.json`
```

Resolve once for the suite/module rather than rebuilding repeatedly unless test isolation requires otherwise.

Do not create any test-only normalization algorithm.

Remove all test imports/usages of a manually encoded `DIRECTUS_ASSET_CACHE_PREFIX` if no longer needed.

---

## 13. Add one focused namespace regression test

Add a small test for `resolveAssetCacheStoragePrefix()` in `asset-cache.test.ts` (preferred) or `asset-prune.test.ts`.

The test must prove that the helper delegates to ocache's escaped namespace rather than our raw `directus-assets` name.

Do **not** hardcode the current hash.

Suitable assertions are conceptually:

```ts
const prefix = await resolveAssetCacheStoragePrefix();

expect(prefix).toContain("handlers:");
expect(prefix).not.toContain("directus-assets");
expect(prefix).toContain("directusassets.");
expect(prefix.endsWith(":")).toBe(true);
```

Do not test the exact hash or exact hash algorithm.

---

## 14. Keep the real filesystem E2E

Keep:

```text
modules/directus-client/__tests__/asset-prune.e2e.test.ts
modules/directus-client/__tests__/fixtures/prune/
```

The E2E should continue to use:

- a real Nuxt/Nitro fixture;
- a real filesystem-backed Nitro storage mount;
- a local deterministic upstream HTTP server;
- the actual Directus asset route;
- request-triggered pruning;
- an unrelated foreign key in the same storage mount.

Do not replace the filesystem storage with memory or mocks.

The fixture should continue using config equivalent to:

```ts
nitro: {
  storage: {
    "directus-assets": {
      driver: "fs",
      base: process.env.DIRECTUS_PRUNE_E2E_CACHE_DIR
    }
  }
}
```

with a short cache lifetime/prune interval such as `maxAge: 1`, `interval: 1`.

---

## 15. Harden E2E cache-population timing

The current E2E reads storage immediately after asset requests. Cache fill may complete through background `waitUntil()`/streaming work, so do not assume the response returning means the write has already landed.

Use the existing bounded `waitFor()` polling helper for cache **creation** as well as deletion.

Required sequence:

### A. Populate asset A

1. Request `/_directus/assets/asset-a`.
2. Poll storage until at least one non-foreign Directus cache key exists.
3. Only then capture `keysAfterA`.

### B. Add foreign key

Create `foreign-key` in the same `directus-assets` storage mount using the fixture API.

### C. Let A expire

Wait just beyond `maxAge`/prune interval. The existing ~1100 ms wait is fine with `maxAge: 1`, `interval: 1`.

### D. Populate asset B and trigger pruning

1. Request `/_directus/assets/asset-b`.
2. Poll until at least one new non-foreign key exists that was not present in `keysAfterA`.
3. Capture that as the B key set.

### E. Wait for prune completion

Poll until all keys from `keysAfterA` are gone.

### F. Final assertions

Assert:

- every stale A key is gone;
- B key(s) remain;
- `foreign-key` remains.

Use bounded polling. Do not use unbounded loops.
Do not increase sleeps to several seconds unnecessarily.

---

## 16. Keep foreign-key coverage

The fixture endpoint that writes `foreign-key` into the same `directus-assets` mount is important.

Keep it and keep the final assertion that `foreign-key` survives pruning.

This is the real-world proof that `storage.getKeys(prefix)` scopes the namespace correctly even when the storage mount contains unrelated data.

---

## 17. Keep deterministic local upstream

The E2E must not contact a real external Directus instance.

Keep the local Node HTTP server returning cacheable 200 responses for `asset-a` and `asset-b` with deterministic body content, and 404 for unknown assets.

No external network dependency.

---

## 18. Clean temporary diagnostics

The prior debugging attempt may have left uncommitted diagnostic work.

Before changing code, inspect:

```bash
git status
git diff
```

Preserve useful final E2E/test code described above, but remove any diagnostics that are not part of the final test.

Examples to remove if present:

- direct/manual prune debug endpoints;
- temporary console logs;
- key-dump debug code not needed by the final fixture;
- commented exploratory code;
- temporary files.

The final fixture should contain only routes required by the finished test, expected to include roughly:

```text
server/api/directus-asset-cache-keys.get.ts
server/api/directus-asset-cache-foreign.post.ts
```

A dedicated manual prune endpoint should not be necessary.

---

## 19. Preserve coordinator and task behavior

Do not change request coordinator architecture.

Request-triggered pruning remains:

- opt-in via `prune.enabled`;
- optionally disabled via `prune.onRequest`;
- throttled by `prune.interval`;
- single-flight per Nitro application state;
- best-effort;
- failures caught/logged so `waitUntil()` receives a resolved promise;
- promise state cleared after completion/failure.

The explicit Nitro prune task remains different:

```text
request pruning failure -> log/contain
manual/scheduled task failure -> reject/propagate
```

Do not change this distinction.

---

## 20. Do not change unrelated behavior

Do not touch:

- authentication/session fallback;
- public-only shared-cache security;
- Directus URL resolution;
- request/header forwarding;
- cache key resource hashing/HTTP key generation;
- conditional requests;
- cacheability rules;
- body-size behavior;
- storage adapter selection;
- Redis/Valkey behavior;
- Cloudflare behavior;
- native TTL detection;
- max-size/LRU eviction;
- distributed locks/coordination;
- refresh coordinator/auth work.

Do not add distributed pruning locks, Redis leases, Durable Objects, or CAS.

Do not implement cache max-size eviction in this PR.

---

## 21. Expected final ownership

Final code should read conceptually as:

```text
cache.ts
  DIRECTUS_ASSET_CACHE_BASE
  DIRECTUS_ASSET_CACHE_GROUP
  DIRECTUS_ASSET_CACHE_NAME
  createAssetCacheStorage()
  resolveAssetCacheStoragePrefix()
        |
        | uses public ocache.resolveCacheKeys()
        v

prune.ts
  prefix = await resolveAssetCacheStoragePrefix()
  keys = await useStorage(config.storage).getKeys(prefix)
  prune entries
        |
        v

Unstorage
  normalizes/scopes keys
```

There should be no second namespace algorithm anywhere in this module or tests.

---

## 22. Required test coverage after the fix

Existing tests must continue covering:

- fresh entry retained;
- exact expiry boundary retained;
- one millisecond beyond expiry removed;
- finite SWR;
- unbounded SWR;
- stored `maxAge` override;
- stored `staleMaxAge` override;
- `staleMaxAge: 0`;
- `maxAge: 0` immediate expiry;
- malformed blob frame removal;
- missing value removal;
- empty value removal;
- unsuccessful status removal;
- missing headers removal;
- invalid body removal;
- string body accepted;
- binary body accepted;
- invalid `mtime` removal;
- invalid present lifetime metadata removal;
- storage read failures skipped;
- delete failures skipped;
- later keys still processed after failures;
- driver `flags.ttl === true` skips pruning;
- foreign/unrelated keys remain untouched;
- missing mount throws;
- coordinator disabled/onRequest behavior;
- coordinator throttle;
- coordinator single-flight;
- independent app state;
- coordinator failure containment;
- task disabled behavior;
- task summary;
- task failure propagation.

Add/retain explicit namespace coverage:

- `resolveAssetCacheStoragePrefix()` reflects ocache escaping;
- unit prune tests use the derived prefix rather than a manually encoded one;
- real filesystem E2E passes.

---

## 23. Validation

Run the normal repository validation:

```bash
corepack pnpm format
corepack pnpm lint:fix
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Also run the pruning E2E explicitly if the repository has a separate E2E command.

Known unrelated CI failures are outside scope. Do not fix unrelated CI.

Then inspect:

```bash
git status
git diff --check
git diff
```

---

## 24. Final manual checklist

Before finishing, verify all of these are true:

- [ ] `DIRECTUS_ASSET_CACHE_NORMALIZED_PREFIX` is gone.
- [ ] No manual `.replace(/\W/g, "")` is used to derive the cache namespace.
- [ ] No manual slash stripping is used to derive the cache namespace.
- [ ] No copied ocache hash logic exists.
- [ ] No deep import from ocache internals exists.
- [ ] `resolveCacheKeys` is imported from public `"ocache"`.
- [ ] `resolveAssetCacheStoragePrefix()` lives in `cache.ts`.
- [ ] Pruning performs one scoped `getKeys(prefix)` call.
- [ ] There is no post-`getKeys()` `startsWith()` namespace filter.
- [ ] No Unstorage normalization helper is called manually for this feature.
- [ ] No new `unstorage` dependency was added solely for pruning.
- [ ] Unit tests derive cache prefixes through the production helper.
- [ ] Namespace regression test does not hardcode the hash.
- [ ] Real filesystem E2E passes.
- [ ] E2E waits for A to be written before capturing A keys.
- [ ] E2E waits for B to be written before capturing B keys.
- [ ] Stale A is removed.
- [ ] Fresh B remains.
- [ ] `foreign-key` remains.
- [ ] Existing malformed-entry semantics remain intact.
- [ ] Existing expiry/SWR semantics remain intact.
- [ ] Request background failures are still contained.
- [ ] Task failures still propagate.
- [ ] No unrelated public API changes were made.
- [ ] No temporary diagnostic files/logging remain.
- [ ] This task file is removed before the final implementation commit.

---

## 25. Final commit

After all code/tests pass and this task file has been removed, create one focused implementation commit.

Suggested commit message:

```text
fix(directus-client): resolve asset cache prune namespace via ocache
```

Push to the existing branch:

```text
feat/cache-prune
```

Do not open a new PR.

---

## Acceptance criteria

The task is complete only when:

1. The real filesystem pruning E2E passes.
2. Pruning discovers entries written by the actual ocache handler.
3. Namespace construction is delegated to public `ocache.resolveCacheKeys()`.
4. Storage normalization/scoping is delegated to Nitro/Unstorage.
5. No manual reimplementation of ocache escaping/hashing remains.
6. No manual reimplementation of Unstorage normalization remains.
7. Pruning uses exactly one scoped `getKeys(prefix)` enumeration.
8. Foreign keys in the same storage mount are not pruned.
9. Existing malformed-entry and expiry semantics stay correct.
10. Unit tests no longer depend on the incorrect raw-prefix assumption.
11. E2E waits for asynchronous cache persistence before inspecting keys.
12. No temporary debug code remains.
13. No unrelated architecture/public API changes are introduced.
14. This task file is removed from the final tree.
