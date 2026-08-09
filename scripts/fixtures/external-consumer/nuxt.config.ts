export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  modules: [
    "@onderwijsin/nuxt-cache",
    "@onderwijsin/nuxt-device",
    "@onderwijsin/nuxt-healthcheck",
    "@onderwijsin/nuxt-loops-renderer",
    "@onderwijsin/nuxt-newsletter-signup",
    "@onderwijsin/nuxt-simple-rate-limiter",
    "@onderwijsin/nuxt-static-text",
    "@onderwijsin/nuxt-storage-admin",
    "@onderwijsin/nuxt-theme-customizer",
    "@onderwijsin/nuxt-turnstile",
    "@onderwijsin/nuxt-ui-form-extensions",
    "@onderwijsin/nuxt-webmanifest"
  ],
  cache: {
    enabled: true,
    adminToken: "dummy-cache-token"
  },
  device: {
    enabled: true
  },
  healthcheck: {
    enabled: true,
    cloudinary: {
      enabled: false,
      cloudName: "dummy-cloud",
      apiKey: "dummy-key",
      apiSecret: "dummy-secret"
    },
    directus: {
      enabled: false,
      baseUrl: "https://dummy.invalid"
    }
  },
  loopsRenderer: {
    applyInlineStyles: false
  },
  newsletterSignup: {
    enabled: true,
    provider: "loops",
    apiKey: "dummy-loops-key",
    lists: { default: "dummy-list" }
  },
  simpleRateLimiter: {
    global: { enabled: false }
  },
  staticText: {
    enabled: true,
    content: "assets/ui/content.ts"
  },
  storageAdmin: {
    enabled: true,
    adminToken: "dummy-storage-token",
    ui: { enabled: false }
  },
  themeCustomizer: {
    enabled: true,
    googleFonts: { families: ["Inter"], apiKey: "dummy-fonts-key" },
    primary: {
      default: {
        50: "#f8fafc",
        100: "#f1f5f9",
        200: "#e2e8f0",
        300: "#cbd5e1",
        400: "#94a3b8",
        500: "#64748b",
        600: "#475569",
        700: "#334155",
        800: "#1e293b",
        900: "#0f172a",
        950: "#020617"
      }
    }
  },
  turnstile: {
    enabled: true,
    siteKey: "1x00000000000000000000AA",
    secretKey: "1x0000000000000000000000000000000AA",
    adminToken: "dummy-turnstile-token"
  },
  webmanifest: {
    enabled: true,
    manifest: {
      name: "External consumer validation",
      short_name: "External consumer",
      start_url: "/"
    }
  }
});
