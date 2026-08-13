import { varlockVitePlugin } from "@varlock/vite-integration";
import { ENV } from "varlock/env";
import { name as packageName } from "../package.json";
import type { ModuleOptions, NewsletterProvider } from "../src/config/options.schema";

/**
 * Selects the provider used by the playground configuration.
 *
 * @param provider - Provider to use.
 * @returns The selected provider.
 */
function selectProvider(provider: NewsletterProvider): NewsletterProvider {
  return provider;
}

const SELECTED_PROVIDER = selectProvider("loops");

const loopsConfig = {
  provider: "loops",
  apiKey: ENV.LOOPS_API_KEY,
  lists: {
    default: ENV.LOOPS_LIST_ID,
    options: [
      { label: "Nieuwsbrief algemeen", id: ENV.LOOPS_LIST_ID },
      { label: "Nieuwsbrief met updates", id: ENV.LOOPS_LIST_ID }
    ]
  },
  fields: {
    firstName: { required: true },
    lastName: { required: false },
    organization: { required: false }
  }
} satisfies Partial<ModuleOptions>;

const mailchimpConfig = {
  provider: "mailchimp",
  apiKey: ENV.MAILCHIMP_API_KEY,
  server: ENV.MAILCHIMP_SERVER,
  lists: {
    default: ENV.MAILCHIMP_AUDIENCE_ID ?? "",
    options: [
      {
        label: "Nieuwsbrief algemeen",
        id: ENV.MAILCHIMP_AUDIENCE_ID ?? "",
        server: ENV.MAILCHIMP_SERVER
      },
      {
        label: "Nieuwsbrief met updates",
        id: ENV.MAILCHIMP_AUDIENCE_ID ?? "",
        server: ENV.MAILCHIMP_SERVER
      }
    ]
  },
  fields: {
    firstName: { required: true, target: "FNAME" },
    lastName: { required: false, target: "LNAME" },
    organization: { required: false, target: "ORG" }
  }
} satisfies Partial<ModuleOptions>;

export default defineNuxtConfig({
  extends: ["playground-layer"],
  vite: {
    plugins: [varlockVitePlugin({ ssrInjectMode: "auto-load" })]
  },
  modules: ["@onderwijsin/nuxt-newsletter-signup"],
  appConfig: { packageName },
  newsletterSignup: {
    ...(SELECTED_PROVIDER === "loops" ? loopsConfig : mailchimpConfig)
  }
});
