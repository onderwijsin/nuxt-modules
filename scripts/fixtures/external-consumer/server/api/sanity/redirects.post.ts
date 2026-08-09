import { defineEventHandler } from "h3";
import { refreshRedirects } from "@onderwijsin/nuxt-redirects/runtime";

/**
 * Refreshes the external-consumer redirect source through its published runtime API.
 *
 * @returns The newly written redirect index.
 */
export default defineEventHandler(async () => ({ data: await refreshRedirects() }));
