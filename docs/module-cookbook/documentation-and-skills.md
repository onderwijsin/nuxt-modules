# Consumer documentation and skills

Read this article whenever public options, exports, components, composables, auto-imports,
registration behavior, compatibility, requirements, errors, or other consumer-visible behavior could
change.

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

## Synchronization decision

Trace the implementation change through both consumer surfaces:

| Change                                                                                            | README                                        | Consumer skill                                     |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------- |
| Installation, Nuxt registration, or requirements                                                  | Update                                        | Update                                             |
| Public option, default, or disabled behavior                                                      | Update                                        | Update                                             |
| Export, component, composable, auto-import, route, or other public API                            | Update                                        | Update                                             |
| Compatibility, dependency, secret/configuration boundary, limitation, or troubleshooting behavior | Update                                        | Update when it affects agent integration decisions |
| Internal refactor with identical public behavior                                                  | No content change required; record the reason | No content change required; record the reason      |

The README and consumer skill have different audiences but must describe the same public contract.
Do not copy maintainer implementation details into either document merely to prove synchronization.
When no consumer document changes are needed, state the concrete no-impact reason in the handoff.
