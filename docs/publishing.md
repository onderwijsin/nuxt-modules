# Publishing

Publishing is not enabled yet.

The repository currently has the Changesets CLI and Publint installed, and the
root package exposes these Changesets commands:

```sh
pnpm changeset
pnpm changeset:status
pnpm changeset:version
pnpm changeset:publish
```

The first publishable module is `@onderwijsin/nuxt-ui-form-extenions`. Release
automation and Changesets configuration are still being added, so do not run
`changeset:publish` until those pieces are ready.
