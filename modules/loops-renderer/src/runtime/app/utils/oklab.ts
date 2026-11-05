/** Coordinates for Euclidean color-distance comparisons in OKLab. */
export interface OklabColor {
  lightness: number;
  a: number;
  b: number;
}

/**
 * Converts normalized sRGB hex into OKLab using linear-light sRGB and the OKLab matrices.
 * See https://www.w3.org/TR/css-color-4/#color-conversion-code.
 * @param hex - A validated six-digit source hex color.
 * @returns OKLab coordinates; this never transforms a rendered color or target CSS token.
 */
export function sourceHexToOklab(hex: string): OklabColor {
  const red = linearChannel(hex.slice(1, 3));
  const green = linearChannel(hex.slice(3, 5));
  const blue = linearChannel(hex.slice(5, 7));
  const l = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
  const m = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
  const s = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);
  return {
    lightness: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  };
}

/**
 * Removes the sRGB transfer curve from one hex channel.
 * @param hex - A two-digit hex channel.
 * @returns Linear-light channel intensity.
 */
function linearChannel(hex: string): number {
  const value = Number.parseInt(hex, 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/**
 * Measures perceptual source-color distance without interpreting mapped CSS values.
 * @param first - First source color in OKLab.
 * @param second - Second source color in OKLab.
 * @returns Euclidean OKLab distance (Delta E OK, with lightness on a 0–1 scale).
 */
export function oklabDistance(first: OklabColor, second: OklabColor): number {
  return Math.hypot(first.lightness - second.lightness, first.a - second.a, first.b - second.b);
}
