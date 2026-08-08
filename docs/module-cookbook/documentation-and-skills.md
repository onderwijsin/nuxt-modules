# Consumer documentation and skills

Every published module has a package `README.md`, `CHANGELOG.md`, and a consumer-facing installable
skill in `skills/<module-name>/SKILL.md`.

Write the README and consumer skill for application developers, not module maintainers. Explain
purpose, installation, Nuxt registration, public API, configuration, compatibility, important
dependencies, and troubleshooting or boundaries where useful. Include concise, copyable examples
using public package names and exports.

Do not expose internal runtime paths, utilities, workspace packages, implementation details, or
module-builder mechanics as consumer API. Consumer README and skill examples must use only the
published module package, auto-imported APIs, and documented public exports. Never include a code
example importing `@onderwijsin/nuxt-module-utils`: although it is published for module runtime
dependencies, consumers are not intended to install it directly. Describe what consumers configure
or import, not how the module works internally. Keep the README and skill aligned whenever options,
exports, components, auto-imports, compatibility, or behavior changes.

Use existing module READMEs and skills as local writing patterns. For maintainer guidance, use the
repository's `authoring-nuxt-modules` skill and this cookbook.
