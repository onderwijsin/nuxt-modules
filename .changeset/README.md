# Changesets

Add a changeset for every user-facing module change. Private workspace
Private workspace utilities are ignored by Changesets and do not need release entries. The
publishable `@onderwijsin/nuxt-module-utils` package does require release entries when its public
API or behavior changes.

Use the `no-changeset` pull request label for changes that do not affect a
published package, such as documentation-only or CI-only changes.
