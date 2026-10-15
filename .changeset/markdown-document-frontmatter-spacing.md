---
"@onderwijsin/nuxt-markdown-documents": patch
---

Separate YAML frontmatter from the Markdown body with exactly one blank line. Normalize leading
blank body lines only when metadata is present; preserve bodies with empty frontmatter unchanged.
