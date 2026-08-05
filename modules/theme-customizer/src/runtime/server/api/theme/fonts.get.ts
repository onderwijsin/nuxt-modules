import { $fetch } from "ofetch";
import { defineEventHandler, getQuery } from "h3";
import { useRuntimeConfig } from "nitropack/runtime";
import { z } from "zod";

type ThemeFontOption = {
  label: string;
  value: string;
};

type ThemeFontsRuntimeConfig = {
  themeCustomizerGoogleFontsApiKey?: string;
  public?: {
    themeCustomizer?: {
      googleFonts?: {
        families?: string[];
      };
    };
  };
};

const standardFonts = [
  "Public Sans",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "DM Sans",
  "Inter",
  "Poppins",
  "Nunito Sans",
  "Raleway",
  "Merriweather",
  "Playfair Display"
];

const googleFontsResponseSchema = z.object({
  items: z.array(z.object({ family: z.string().min(1) }))
});

const querySchema = z.object({ q: z.string().trim().max(80).catch("") });
let cachedFonts: ThemeFontOption[] | undefined;

/**
 * Returns searchable Google Font families through a server-side API-key proxy.
 * @param event The incoming Nitro request event.
 * @returns Matching font family options.
 */
export default defineEventHandler(async (event): Promise<ThemeFontOption[]> => {
  const query = querySchema.parse(getQuery(event));
  const config = useRuntimeConfig(event) as ThemeFontsRuntimeConfig;
  const apiKey = config.themeCustomizerGoogleFontsApiKey;
  const configuredFonts = config.public?.themeCustomizer?.googleFonts?.families;
  const fallbackFonts = toFontOptions(configuredFonts?.length ? configuredFonts : standardFonts);

  if (!apiKey) return filterFonts(fallbackFonts, query.q);

  if (!cachedFonts) {
    try {
      const response = await $fetch<unknown>("https://www.googleapis.com/webfonts/v1/webfonts", {
        query: { capability: "WOFF2", key: apiKey, sort: "popularity" }
      });
      const parsed = googleFontsResponseSchema.safeParse(response);
      if (parsed.success) {
        cachedFonts = parsed.data.items.map(({ family }) => ({ label: family, value: family }));
      }
    } catch (error) {
      console.error("Failed to fetch Google Fonts metadata", error);
    }
  }

  return filterFonts(cachedFonts ?? fallbackFonts, query.q);
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
