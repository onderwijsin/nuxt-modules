export const DEFAULT_THEME_FONT = "Public Sans";

const FONT_FAMILY_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} .,'&+()_-]{0,99}$/u;

/**
 * Validates a font family name before it is written into a CSS declaration or URL.
 * @param value Candidate font family name.
 * @returns The trimmed safe family name, or undefined when invalid.
 */
export function sanitizeFontFamily(value: string): string | undefined {
  const family = value.trim();
  return FONT_FAMILY_PATTERN.test(family) ? family : undefined;
}

/**
 * Applies a Google Font family to Nuxt UI and loads its stylesheet in the browser.
 * @param value Font family name to apply.
 * @returns Nothing.
 */
export function applyThemeFont(value: string): void {
  if (!import.meta.client) return;

  const family = sanitizeFontFamily(value);
  if (!family) return;

  document.documentElement.style.setProperty("--font-sans", `'${family}', sans-serif`);

  const linkId = "theme-customizer-font";
  const existingLink = document.getElementById(linkId);
  if (family === DEFAULT_THEME_FONT) {
    existingLink?.remove();
    return;
  }

  const link =
    existingLink instanceof HTMLLinkElement ? existingLink : document.createElement("link");
  link.id = linkId;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}
