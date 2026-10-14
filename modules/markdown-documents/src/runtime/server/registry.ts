import { z } from "zod";
import { attemptSync, isFunction } from "@onderwijsin/nuxt-module-utils/shared";

const PARAMETER_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/u;
const LITERAL_SEGMENT = /^[\p{L}\p{N}._~-]+$/u;

const callbackSchema = z.custom<(...args: never[]) => unknown>(isFunction, {
  error: "Expected a function."
});
const definitionSchema = z.object({
  route: z.string(),
  fetch: callbackSchema,
  transform: callbackSchema,
  list: callbackSchema.optional(),
  prerender: z.boolean().optional()
});

/** Discovered definition with its source filename retained for diagnostics. */
interface DefinitionSource {
  source: string;
  definition: unknown;
}

/**
 * Validates the supported canonical route grammar.
 * @param route Canonical route pattern from a consumer definition.
 * @returns Literal and parameter segments, with root represented by an empty array.
 */
export function parseDocumentRoute(route: string): string[] {
  if (route === "/") return [];
  if (
    !route.startsWith("/") ||
    route.endsWith("/") ||
    route === "/index" ||
    route.endsWith(".md")
  ) {
    throw new Error(
      `Invalid document route "${route}". Use / or a canonical path such as /blog/:slug; /index and .md routes are reserved.`
    );
  }
  const segments = route.slice(1).split("/");
  const parameters = new Set<string>();
  for (const segment of segments) {
    if (segment.startsWith(":")) {
      const name = segment.slice(1);
      if (!PARAMETER_NAME.test(name) || parameters.has(name)) {
        throw new Error(`Invalid or repeated route parameter in "${route}".`);
      }
      parameters.add(name);
      continue;
    }

    if (!LITERAL_SEGMENT.test(segment) || segment === "." || segment === "..") {
      throw new Error(
        `Invalid document route "${route}". Only literal segments and named single-segment parameters are supported.`
      );
    }
  }
  return segments;
}

interface ParsedRoute {
  segments: string[];
  specificity: number;
}

/**
 * Validates an imported definition and adds its filename to route errors.
 * @param entry Consumer definition and its source filename.
 * @returns Parsed route segments and their literal-segment count.
 */
function parseDefinitionRoute(entry: DefinitionSource): ParsedRoute {
  const result = definitionSchema.safeParse(entry.definition);
  if (!result.success) {
    throw new Error(
      `Invalid Markdown document definition in ${entry.source}: ${z.prettifyError(result.error)}`
    );
  }

  const parsed = attemptSync(() => parseDocumentRoute(result.data.route));
  if (parsed.data === null) {
    const reason = parsed.error instanceof Error ? parsed.error.message : "unsupported route";
    throw new Error(`Invalid Markdown document route in ${entry.source}: ${reason}`);
  }

  const segments = parsed.data;
  const specificity = segments.filter((segment) => !segment.startsWith(":")).length;
  return { segments, specificity };
}

/**
 * Identifies equally specific routes that can match the same canonical path.
 * @param left First parsed route.
 * @param right Second parsed route.
 * @returns Whether neither route has an unambiguous precedence over the other.
 */
function routesConflict(left: ParsedRoute, right: ParsedRoute): boolean {
  if (left.specificity !== right.specificity) return false;
  if (left.segments.length !== right.segments.length) return false;

  return left.segments.every((segment, index) => {
    const other = right.segments[index];
    if (segment === other) return true;
    return segment.startsWith(":") || other?.startsWith(":");
  });
}

/**
 * Validates definitions without executing fetch, transform or listing callbacks.
 * @param sources Imported definitions paired with diagnostic source filenames.
 * @returns Original definitions ordered with static routes before parameter routes.
 */
export function validateDocumentDefinitions<T extends DefinitionSource>(sources: T[]): T[] {
  const definitions = sources.map((entry) => ({ entry, route: parseDefinitionRoute(entry) }));

  for (const [index, current] of definitions.entries()) {
    for (const other of definitions.slice(index + 1)) {
      if (!routesConflict(current.route, other.route)) continue;

      throw new Error(
        `Ambiguous Markdown document routes in ${current.entry.source} and ${other.entry.source}. Use distinct patterns or different specificity.`
      );
    }
  }

  definitions.sort((left, right) => right.route.specificity - left.route.specificity);
  return definitions.map(({ entry }) => entry);
}
