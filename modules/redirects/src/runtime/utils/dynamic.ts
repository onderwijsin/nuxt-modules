import type { DynamicRedirectRule, ResolvedRedirect } from "../types/redirect";

import { inject, parse } from "regexparam";

/** A process-local dynamic matcher and destination resolver. */
export interface CompiledDynamicRedirect {
  match: (pathname: string) => Record<string, string> | null;
  destination: (params: Record<string, string>) => string;
  statusCode: DynamicRedirectRule["statusCode"];
  from: string;
}

function decodeParameter(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function encodePathParameter(value: string): string {
  return encodeURIComponent(value);
}

function encodeWildcardParameter(value: string): string {
  return value
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

/**
 * Compiles serializable dynamic definitions into process-local matchers.
 *
 * @param rules - Serializable dynamic redirect definitions.
 * @returns Process-local compiled redirect matchers.
 */
export function compileDynamicRedirects(
  rules: readonly DynamicRedirectRule[]
): CompiledDynamicRedirect[] {
  return rules.map((rule) => {
    const parsed = parse(rule.from);
    return {
      from: rule.from,
      match: (pathname) => {
        const result = parsed.pattern.exec(pathname);
        if (!result) return null;
        const params: Record<string, string> = {};
        for (const [index, key] of parsed.keys.entries()) {
          params[key] = decodeParameter(result[index + 1] ?? "");
        }
        return params;
      },
      destination: (params) =>
        inject(
          rule.to,
          Object.fromEntries(
            Object.entries(params).map(([key, value]) => [
              key,
              key === "*" ? encodeWildcardParameter(value) : encodePathParameter(value)
            ])
          )
        ),
      statusCode: rule.statusCode
    };
  });
}

/**
 * Finds the first dynamic redirect matching a pathname.
 *
 * @param compiled - Process-local compiled redirect matchers.
 * @param pathname - Request pathname without a query string.
 * @returns The resolved redirect, or null when no rule matches.
 */
export function findCompiledDynamicRedirect(
  compiled: readonly CompiledDynamicRedirect[],
  pathname: string
): ResolvedRedirect | null {
  for (const rule of compiled) {
    const params = rule.match(pathname);
    if (params) {
      return {
        from: rule.from,
        to: rule.destination(params),
        statusCode: rule.statusCode,
        match: "pattern"
      };
    }
  }
  return null;
}
