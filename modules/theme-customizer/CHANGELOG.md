# Changelog

## 0.2.6

### Patch Changes

- 70ff6f1: Refactor module option validation to parse complete module-owned Zod schemas directly, with uniform validation error logging and typed validated options.
- ec29c96: Update module utils import to runtime dependent namespace
- 8bb6cd7: Added shared module utilities for runtime transpilation, typed object entry conversion, and consistent option validation. Updated consuming modules to use the shared helpers, preserve arbitrary option keys, and remove duplicated setup/validation logic. No public consumer API changes.

## 0.2.5

### Patch Changes

- bb5e548: Make custom color names and custom color groups editable. Add support for ciustom token values (eg default font, radius, primary color etc)

## 0.2.4

### Patch Changes

- 17c7443: Replace all $fetch instances with ofetch

## 0.2.3

### Patch Changes

- 8f2ed27: replace $fetch with ofetch in google fonts client

## 0.2.2

### Patch Changes

- 018ad25: Fix type template location and prevent type write skip in prepare mode

## 0.2.1

### Patch Changes

- f87eda6: Rename confirm dialog component and composable to namespaced files to prevent conflicts with consumers
- c39e4bc: Finetune prepare and packaging scripts

## 0.2.0

### Minor Changes

- 3f927e1: Add the publishable Nuxt UI theme customizer module with runtime theme
  selection, palette editor, playground, and consumer skill.

## 0.1.0

- First publishable version of the Nuxt UI theme picker.
