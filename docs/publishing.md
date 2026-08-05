# Publishing

Publishing is manual and is never triggered by a push to `main`. The
`prepare-release.yml` workflow versions packages and opens a release pull
request; after that pull request is merged, `publish.yml` publishes from
`main`.

The repository currently has the Changesets CLI and Publint installed, and the
root package exposes these Changesets commands:

```sh
pnpm changeset
pnpm changeset:status
pnpm changeset:version
pnpm changeset:publish
```

The first publishable module is `@onderwijsin/nuxt-ui-form-extenions`. The
private `module-utils` and `test-utils` packages are ignored by Changesets.
The `NPM_TOKEN` GitHub secret must be configured before running the publish
workflow. The npm token is read only through `.npmrc` and is never committed.
