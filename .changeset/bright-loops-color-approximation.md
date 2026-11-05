---
"@onderwijsin/nuxt-loops-renderer": minor
---

Add the auto-imported createLoopsColorMapper utility with role-specific exact matching and opt-in
nearest-source matching through colorMapping.approximation. Approximation uses a bounded OKLab
distance and preserves exact matches, CSS-token targets and unmatched colors. Select strategies at
build time so disabled approximation code and unused mapper utilities are absent from app bundles.
