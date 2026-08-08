import { z } from "zod";
import { ofetch } from "ofetch";
import { createError, defineEventHandler, getQuery } from "h3";
import { attempt } from "@onderwijsin/nuxt-module-utils/shared";

const hexSchema = z.string().regex(/^#[\da-f]{6}$/i, {
  error: "Invalid hex color"
});

/**
 * Proxies a generated Tailwind palette for the internal theme picker.
 *
 * @param event The incoming Nitro request event.
 * @returns The generated palette returned by ColorFYI.
 */
export default defineEventHandler(async (event): Promise<unknown> => {
  const parsedHex = hexSchema.safeParse(getQuery(event).hex);

  if (!parsedHex.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid hex color" });
  }

  const result = await attempt(() =>
    ofetch<unknown>(`https://colorfyi.com/api/shades/${parsedHex.data.slice(1).toUpperCase()}/`)
  );
  if (result.error !== null) {
    console.error("Failed to generate ColorFYI theme palette");
    throw createError({ statusCode: 502, statusMessage: "Unable to generate color palette" });
  }
  return result.data;
});
