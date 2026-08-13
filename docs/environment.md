# Environment management

The external-service playgrounds use Varlock with the Proton Pass plugin. This keeps the environment
contract in Git while keeping secret values in Proton Pass, so a new worktree does not need copied
or untracked `.env` files.

## Playground schemas

The configured playgrounds each own a root schema:

- `modules/directus-client/playground/.env.schema`
- `modules/newsletter-signup/playground/.env.schema`
- `modules/sentry-config/playground/.env.schema`

There is one default environment for local development and CI. Environment-specific profiles are not
used yet. Each schema also generates `env.d.ts` in its playground root. This file is derived,
ignored by Git, and refreshed whenever Varlock loads through the Vite integration.

The Proton Pass references use this form:

```text
pass://nuxt-modules/<item>/<field>
```

The vault is `nuxt-modules`; the item names are `directus-client`, `newsletter-signup`, and
`sentry-config`.

## Local development

Install and authenticate the Proton Pass CLI, then run the relevant playground as usual:

```sh
pass-cli login
pnpm --filter directus-playground dev
pnpm --filter newsletter-signup-playground dev
pnpm --filter sentry-config-playground dev
```

To explicitly load and validate all three schemas, including type generation:

```sh
pnpm varlock:load
```

Each playground also exposes its development-only loader:

```sh
pnpm --filter directus-playground varlock:load
```

Do not print resolved environment values or add local overrides to Git. If a local override is
needed, use an ignored `.env.local` file in the owning playground and keep it free of values that
should be shared with the team.

## Proton Pass personal access tokens

CI uses the `PROTON_PASS_PERSONAL_ACCESS_TOKEN` secret. Create a narrowly scoped token with access
to the `nuxt-modules` vault and the required items, then store the token as the repository secret.
Tokens expire and must be renewed or replaced; the token itself must never be committed.

See the official
[Proton Pass personal access token documentation](https://protonpass.github.io/pass-cli/commands/personal-access-token/)
for creating, scoping, renewing, and managing PATs.

## CI

CI installs `pass-cli` through the local composite action at
`.github/actions/install-proton-pass-cli/action.yml`. Jobs that can load a playground environment
receive `PROTON_PASS_PERSONAL_ACCESS_TOKEN` explicitly, including installation, preparation,
typechecking, tests, builds, and package validation.

The action installs the CLI in `$HOME/.local/bin`, adds that directory to `GITHUB_PATH`, and only
prints the CLI version. Resolved secrets must not be echoed or uploaded in artifacts.

Fork pull requests may not receive repository secrets. In that case, environment-dependent checks
need an actionable failure rather than silently substituting production credentials.

## Troubleshooting

- `pass-cli` is not found: install it and ensure it is on `PATH`.
- Authentication fails: run `pass-cli login` locally, or verify the CI PAT is present, valid, and
  authorized for the `nuxt-modules` vault.
- An item or field is missing: verify the exact Proton Pass item and field name used by the owning
  `.env.schema`.
- TypeScript cannot find the environment types: run the playground's `varlock:load` script and
  confirm the generated `env.d.ts` exists locally. It should remain ignored and uncommitted.
