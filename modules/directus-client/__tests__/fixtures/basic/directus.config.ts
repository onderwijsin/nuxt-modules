import { defineDirectusConfig } from "@onderwijsin/nuxt-directus-config/config";

export default defineDirectusConfig({
  client: {
    auth: {
      enabled: true,
      user: {
        enabled: true,
        fields: ["id", "email", { role: ["id", "name"] }],
        mapper: (user) => ({
          id: user.id,
          email: user.email,
          displayName: user.email,
          role: user.role?.name ?? null
        })
      }
    }
  }
});
