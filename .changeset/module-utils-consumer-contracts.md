---
"@onderwijsin/nuxt-module-utils": patch
---

Make Zod a consumer-owned peer and accept Nuxt Kit loggers without requiring Consola internals.
`validateModuleOptions` now uses the Zod 4 core schema interface, preserving inferred defaults and
transforms while accepting Classic and Mini schemas. Existing parsing, validation messages,
exceptions, and enabled/disabled behavior remain compatible.

**Who needs to act**

These steps apply to authors of local or published modules that import
`@onderwijsin/nuxt-module-utils` directly. Applications that only install the public Nuxt modules
should upgrade those modules normally; they do not need to add this internal utility package
manually. An existing compatible Zod dependency supplied by a parent module can satisfy the peer.

**Manage the Zod peer explicitly**

The utility no longer installs its own pinned Zod 4.4.3 as a normal dependency. It requires a
compatible peer, `zod@^4.4.3`. Keep the application's existing compatible Zod version; no downgrade
to the development pin is needed. The baseline is Zod 4.4.3, with a separate consumer regression
check on Zod 4.6.7 / Nuxt Kit 4.6.2. No Nuxt upgrade is required solely for this fix.

For a Nuxt application with build-time local modules:

```sh
pnpm add -D @onderwijsin/nuxt-module-utils@0.5.2
pnpm add 'zod@^4.4.3'
```

Declare the utility as a normal dependency instead of a development dependency if application
runtime code imports its `/shared` or `/server` helpers. In workspaces, declare dependencies in the
package that consumes the helpers; do not rely on an unrelated workspace package's installation.

For a published module, keep the utility in normal dependencies so consumers can resolve its emitted
imports:

```sh
pnpm add @onderwijsin/nuxt-module-utils@0.5.2
```

If your module accepts application-created schemas or exports Zod schemas, move Zod from a pinned
normal dependency to a supported peer plus an exact development version. For example, merge these
entries into your module's manifest:

```json
{
  "peerDependencies": { "zod": "^4.4.3" },
  "devDependencies": { "zod": "4.4.3" }
}
```

The development pin above illustrates the tested baseline; keep an existing compatible exact
development version when appropriate. Your module may need a higher peer minimum if it uses newer
Zod APIs. After editing the manifest, run `pnpm install` to update its lockfile.

Modules using Zod only for their own internal validation can retain a compatible normal Zod
dependency. Do not force every unrelated package in the application onto one Zod version; the
important boundary is that the utility and schemas crossing its public API use the consuming
package's compatible installation. Inspect `pnpm why zod`, resolve unmet peer requirements, and
update and commit the appropriate manifests and lockfile. Do not suppress conflicts with peer-rule
exceptions or overrides that merely hide an unsupported version.

**Remove compatibility workarounds**

Pass the actual `useLogger()` result directly to both helpers. `moduleSetup` requires only `start`,
`success`, and `info` methods accepting a message string; `validateModuleOptions` requires only
`info`. Custom loggers can use the exported `ModuleLogger` type from `/build` or `/types`. Remove
casts, local helper copies, or Zod downgrades added solely to work around these helper type errors.
Keep any schema augmentations required by the rest of your module.

Existing schema construction and composition with the exported `enabled` schema remain valid:

```ts
import { useLogger } from "@nuxt/kit";
import { z } from "zod";
import { enabled, moduleSetup, validateModuleOptions } from "@onderwijsin/nuxt-module-utils/build";

const log = useLogger("my-module");
const schema = z.object({ enabled, retries: z.string().transform(Number) });
const options = validateModuleOptions({ retries: "2" }, schema, log);
const retries: number = options.retries;
const setup = moduleSetup("my-module", options, log);
```

The utility also drops its direct Consola dependency. If your own code imports `consola` and relied
on that transitive installation, declare your own dependency; `pnpm add consola@3.4.2` retains the
previously supplied version. Do not add Consola merely to pass a Nuxt logger to these helpers.

**Verify the upgrade**

Run your module's typecheck and build, then the consuming application's `pnpm exec nuxt prepare`,
typecheck, and `pnpm exec nuxt build`. Confirm inferred transformed/defaulted option types, a
rejected configuration with the existing `Invalid module options ☝. Exiting.` error, and disabled
module handling. For a published module, test its packed tarball in an application with the
application's chosen Zod peer; workspace-only typechecking cannot establish this boundary.
