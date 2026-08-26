---
"@onderwijsin/nuxt-directus-client": minor
---

Add the client authentication facade for Directus magic links, including `requestMagicLink` and
`redeemMagicLink`, plus `magicLinksEnabled` and `requiresTfaSetup` state. Invalid local magic-link
tokens now normalize to `INVALID_MAGIC_LINK_TOKEN_INPUT` and `isInvalidMagicLinkTokenInput`.
