# Testing

Vitest is the repository test runner. Run the current test suite with:

```sh
corepack pnpm test
```

Use watch mode while developing:

```sh
corepack pnpm test:watch
```

Tests are discovered from files matching `*.test.*` and `*.spec.*`, excluding
dependencies and generated Nuxt/build output.

The repository also includes `@nuxt/test-utils` for future Nuxt integration
tests. No integration or end-to-end tests exist yet.

Package-level type checks run recursively with:

```sh
corepack pnpm typecheck
```
