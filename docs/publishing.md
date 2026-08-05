# Publishing

Publishing is not enabled yet.

The repository currently has the Changesets CLI and Publint installed, and the
root package exposes these Changesets commands:

```sh
corepack pnpm changeset
corepack pnpm changeset:status
corepack pnpm changeset:version
corepack pnpm changeset:publish
```

There is not yet a Changesets configuration, publishable module, package
validation flow, or release workflow. Do not run `changeset:publish` until
those pieces are added in a later phase.
