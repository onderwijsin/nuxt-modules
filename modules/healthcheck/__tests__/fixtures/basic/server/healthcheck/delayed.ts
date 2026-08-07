import { defineHealthcheckComponent } from "@onderwijsin/nuxt-healthcheck/runtime";

export default defineHealthcheckComponent({
  handler: async () => {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
});
