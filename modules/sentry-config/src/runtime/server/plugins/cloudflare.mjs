import { sentryCloudflareNitroPlugin } from "@sentry/nuxt/module/plugins";
import { defineNitroPlugin } from "nitropack/runtime";
import { resolveSentryConfig } from "#sentry-config/cloudflare-config.mjs";

const sentryConfig = resolveSentryConfig();

export default defineNitroPlugin(sentryCloudflareNitroPlugin(sentryConfig));
