# Static text and Vue I18n compatibility

Read this decision before changing the static-text translation API, `$t`, `useText`, message
formatting, locale behavior, or coexistence expectations with Vue I18n or Nuxt I18n.

The static-text module is designed for applications with one build-time text dictionary, not as a
replacement implementation of internationalization. It deliberately omits locale selection, runtime
message loading, pluralization, and ICU message syntax.

Even within that narrower scope, its public translation surface follows Vue I18n's familiar `$t`
shape: a dotted message key followed by an optional named-parameter object, returning a string. The
module exposes that translator as `$t` in Vue templates and as the typed `useText` auto-import in
application code. This lets consumers keep ordinary translation call sites compatible when they
later need to adopt Vue I18n or the official Nuxt I18n module.

This compatibility is an API commitment, not a claim of feature parity. `$t` must retain its
key-and-parameters calling convention and string return value; enhancements must not add a different
public translation abstraction for static text. The module owns `$t`, so it cannot run alongside Vue
I18n or Nuxt I18n. Applications that need multiple locales or advanced message formatting should use
the official internationalization stack instead.
