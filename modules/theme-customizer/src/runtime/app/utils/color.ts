/**
 * Converts a CSS color value to a six-digit lowercase hex value.
 * @param value CSS color value to normalize.
 * @param context Optional canvas context used to resolve named CSS colors.
 * @returns A six-digit lowercase hex value, or the original value when it cannot be resolved.
 */
export function normalizeCssColorToHex(
  value: string,
  context?: CanvasRenderingContext2D | null
): string {
  if (value.startsWith("#")) return value.toLowerCase();

  const colorMatch = value.match(/rgba?\((\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)/);
  if (colorMatch) {
    return `#${colorMatch
      .slice(1, 4)
      .map((channel) => Math.round(Number(channel)).toString(16).padStart(2, "0"))
      .join("")}`;
  }

  if (!context) return value;

  context.clearRect(0, 0, 1, 1);
  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);
  const [red = 0, green = 0, blue = 0] = context.getImageData(0, 0, 1, 1).data;
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}
