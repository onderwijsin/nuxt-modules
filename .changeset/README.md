# Changesets

Add a Changeset for every user-facing module change. The private `playground-layer` and `test-utils`
packages are ignored by Changesets and do not need release entries. The publishable
`@onderwijsin/nuxt-module-utils` package does require release entries when its public API or
behavior changes.

Write each entry as a consumer upgrade guide, including required migrations, dependency ownership,
peer ranges and installation steps, and consumer verification. Follow
[Changesets as consumer upgrade guides](../docs/publishing.md#changesets-as-consumer-upgrade-guides)
for the complete release-note contract.

Each Changeset file must cover one concern only. Split unrelated package changes into separate
files, even when they affect the same package or use the same release level.

Use the `no-changeset` pull request label for changes that do not affect a published package, such
as documentation-only or CI-only changes.
