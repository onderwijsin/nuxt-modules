import { defineNuxtConfig } from "nuxt/config";

type Provider = "loops" | "mailchimp";
const SELECTED_PROVIDER = "mailchimp" as Provider;

const loopsListId = process.env.LOOPS_LIST_ID!;
const loopsApiKey = process.env.LOOPS_API_KEY!;
const mailchimpListId = process.env.MAILCHIMP_AUDIENCE_ID!;
const mailchimpApiKey = process.env.MAILCHIMP_API_KEY!;
const mailchimpServer = process.env.MAILCHIMP_SERVER!;

const loopsConfig = {
  provider: "loops",
  apiKey: loopsApiKey,
  lists: {
    default: loopsListId,
    options: [
      { label: "Nieuwsbrief algemeen", id: loopsListId },
      { label: "Nieuwsbrief met updates", id: loopsListId }
    ]
  },
  fields: {
    firstName: { required: true },
    lastName: { required: false },
    organization: { required: false }
  }
} as const;

const mailchimpConfig = {
  provider: "mailchimp",
  apiKey: mailchimpApiKey,
  server: mailchimpServer,
  lists: {
    default: mailchimpListId,
    options: [
      {
        label: "Nieuwsbrief algemeen",
        id: mailchimpListId,
        server: mailchimpServer
      },
      {
        label: "Nieuwsbrief met updates",
        id: mailchimpListId,
        server: mailchimpServer
      }
    ]
  },
  fields: {
    firstName: { required: true, target: "FNAME" },
    lastName: { required: false, target: "LNAME" },
    organization: { required: false, target: "ORG" }
  }
} as const;

export default defineNuxtConfig({
  compatibilityDate: "2026-08-07",
  modules: ["@onderwijsin/nuxt-newsletter-signup", "@nuxt/ui"],
  css: ["~/assets/main.css"],
  newsletterSignup: {
    ...(SELECTED_PROVIDER === "loops" ? loopsConfig : mailchimpConfig)
  },
  devtools: { enabled: false }
});
