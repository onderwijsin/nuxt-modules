import { z } from "zod";
import { ofetch } from "ofetch";
import { createError, defineEventHandler, getQuery } from "h3";
import { defineCachedFunction } from "nitropack/runtime";
import { attempt } from "@onderwijsin/nuxt-module-utils/shared";
import { enforceRateLimit } from "@onderwijsin/nuxt-simple-rate-limiter/runtime";
import { useRuntimeConfig } from "nitropack/runtime";

const hexSchema = z.string().regex(/^#[\da-f]{6}$/i, {
  error: "Invalid hex color"
});
const paletteResponseSchema = z.strictObject({
  hex: z.string().regex(/^[\da-f]{6}$/i),
  shades: z
    .array(z.strictObject({ level: z.number().int(), hex: z.string().regex(/^[\da-f]{6}$/i) }))
    .length(11)
});
const PALETTE_CACHE_TTL_SECONDS = 24 * 60 * 60;
const DEFAULT_RATE_LIMIT = { max: 30, duration: 60, ban: 300 };

const fetchPalette = defineCachedFunction(
  async (cacheKey: string): Promise<z.infer<typeof paletteResponseSchema>> => {
    const result = await attempt(() =>
      ofetch<unknown>(`https://colorfyi.com/api/shades/${cacheKey}/`, { timeout: 5_000 })
    );
    if (result.error !== null) {
      console.error("Failed to generate ColorFYI theme palette");
      throw createError({ statusCode: 502, statusMessage: "Unable to generate color palette" });
    }
    const parsedResponse = paletteResponseSchema.safeParse(result.data);
    if (!parsedResponse.success) {
      console.error("ColorFYI returned an invalid theme palette");
      throw createError({ statusCode: 502, statusMessage: "Unable to generate color palette" });
    }
    return parsedResponse.data;
  },
  {
    name: "theme-customizer-palette",
    maxAge: PALETTE_CACHE_TTL_SECONDS,
    swr: false,
    getKey: (cacheKey) => cacheKey
  }
);

/**
 * Proxies a generated Tailwind palette for the internal theme picker.
 *
 * @param event The incoming Nitro request event.
 * @returns The generated palette returned by ColorFYI.
 */
export default defineEventHandler(async (event) => {
  const rateLimit =
    useRuntimeConfig(event).public?.themeCustomizer?.rateLimit?.palette ?? DEFAULT_RATE_LIMIT;
  if (rateLimit.enabled !== false) {
    const { enabled: _enabled, ...limits } = rateLimit;
    await enforceRateLimit(event, limits);
  }
  const parsedHex = hexSchema.safeParse(getQuery(event).hex);

  if (!parsedHex.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid hex color" });
  }

  const cacheKey = parsedHex.data.slice(1).toUpperCase();
  return fetchPalette(cacheKey);
});
