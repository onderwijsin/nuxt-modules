import webmanifestModule from "../../../src/module";

export default defineNuxtConfig({
  modules: [webmanifestModule],
  site: {
    url: "https://fixture.example",
    name: "Fixture site",
    description: "A fixture application"
  },
  schemaOrg: {
    identity: {
      name: "Fixture app",
      alternateName: "FA"
    }
  },
  webmanifest: {
    manifest: {
      icons: [{ src: "/brand-icon.png", sizes: "512x512", type: "image/png" }]
    }
  }
} as never);
