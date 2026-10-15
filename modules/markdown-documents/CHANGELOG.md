# Changelog

## 0.1.0

### Minor Changes

- f30f065: Add the contentType option with plain and markdown formats, defaulting to plain. Serve the configured MIME type with UTF-8 and unchanged document bytes. Request headers do not override it.
- f30f065: Add typed server document definitions, validated configuration including an optional nullable rawPrefix with no prefix by default, deterministic server-only discovery, route validation and development registry reloads.
- f30f065: Add scoped plain-text Markdown delivery with YAML 1.2 frontmatter, recursive JSON validation,
  method guards. Preserve canonical HTML and unrelated routes.
- f30f065: Remove the inert module and document prerender options. Unsupported options now fail validation instead of silently doing nothing. Configure prerender routes in the consuming Nuxt application; built-in prerender orchestration is deferred.
- f30f065: Add the Markdown Documents development scaffold, Nuxt registration, and documentation.
- f30f065: Add server-only structured document resolution, independent typed metadata listing, and Markdown URL derivation using the application base URL and optional raw prefix. Validate canonical paths and callback results, preserve null for unavailable documents, and sanitize consumer callback failures.

### Patch Changes

- f30f065: Separate YAML frontmatter from the Markdown body with exactly one blank line. Normalize leading
  blank body lines only when metadata is present; preserve bodies with empty frontmatter unchanged.
- f30f065: Include the changelog in the published package alongside the built module, declarations, README and license.
- f30f065: Register document delivery as scoped runtime middleware instead of a global document scanner. Remove build-time inspection and collision checks for application pages and server routes. Consumers are responsible for keeping document-owned Markdown URLs distinct from other application routes, assets and modules.

Release notes are managed with Changesets.
