import { defineHealthcheckComponent } from "@onderwijsin/nuxt-healthcheck/runtime";

export default defineHealthcheckComponent({
  threshold: { warn: 100, error: 500 },
  handler: async () => ({
    details: { source: "playground" }
  })
});
