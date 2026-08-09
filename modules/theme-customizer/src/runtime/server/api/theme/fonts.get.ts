import { z } from "zod";
import { ofetch } from "ofetch";
import { defineEventHandler, getQuery } from "h3";
import { defineCachedFunction, useRuntimeConfig } from "nitropack/runtime";
import { attempt } from "@onderwijsin/nuxt-module-utils/shared";
import { enforceRateLimit } from "@onderwijsin/nuxt-simple-rate-limiter/runtime";

type ThemeFontOption = {
  label: string;
  value: string;
};

const googleFontsResponseSchema = z.object({
  items: z.array(z.object({ family: z.string().min(1) }))
});

const querySchema = z.object({ q: z.string().trim().max(80).catch("") });
const DEFAULT_RATE_LIMIT = { max: 60, duration: 60, ban: 300 };
const GOOGLE_FONTS_CACHE_TTL_SECONDS = 24 * 60 * 60;

const fetchFonts = defineCachedFunction(
  async (apiKey: string): Promise<ThemeFontOption[] | undefined> => {
    const result = await attempt(() =>
      ofetch<unknown>("https://www.googleapis.com/webfonts/v1/webfonts", {
        query: { capability: "WOFF2", key: apiKey, sort: "popularity" }
      })
    );
    if (result.error !== null) {
      console.error("Failed to fetch Google Fonts metadata");
      return undefined;
    }

    const parsed = googleFontsResponseSchema.safeParse(result.data);
    if (!parsed.success) return undefined;

    return parsed.data.items.map(({ family }) => ({ label: family, value: family }));
  },
  {
    name: "theme-customizer-google-fonts",
    maxAge: GOOGLE_FONTS_CACHE_TTL_SECONDS,
    swr: false,
    getKey: () => "google-fonts"
  }
);

/**
 * Returns searchable Google Font families through a server-side API-key proxy.
 * @param event The incoming Nitro request event.
 * @returns Matching font family options.
 */
export default defineEventHandler(async (event): Promise<ThemeFontOption[]> => {
  const query = querySchema.parse(getQuery(event));
  const config = useRuntimeConfig(event);
  const rateLimit = config.public?.themeCustomizer?.rateLimit?.fonts ?? DEFAULT_RATE_LIMIT;
  if (rateLimit.enabled !== false) {
    const { enabled: _enabled, ...limits } = rateLimit;
    await enforceRateLimit(event, limits);
  }
  const apiKey = config.themeCustomizerGoogleFontsApiKey;
  const configuredFonts = config.public?.themeCustomizer?.googleFonts?.families ?? [];
  const fallbackFonts = toFontOptions(configuredFonts);

  if (!apiKey) return filterFonts(fallbackFonts, query.q);

  const fonts = (await fetchFonts(apiKey)) ?? fallbackFonts;
  return filterFonts(fonts, query.q);
});

/**
 * Converts family names into API response options.
 * @param families Font family names to convert.
 * @returns Font options for the theme picker.
 */
function toFontOptions(families: string[]): ThemeFontOption[] {
  return families.map((family) => ({ label: family, value: family }));
}

/**
 * Filters font options by a case-insensitive family-name query.
 * @param fonts Font options to filter.
 * @param query Search query.
 * @returns At most fifty matching font options.
 */
function filterFonts(fonts: ThemeFontOption[], query: string): ThemeFontOption[] {
  const normalizedQuery = query.toLocaleLowerCase();
  return fonts
    .filter((font) => font.value.toLocaleLowerCase().includes(normalizedQuery))
    .slice(0, 50);
}
