import type { H3Event } from "h3";

/** A redirect activation or expiration bound, represented as an ISO date or epoch milliseconds. */
export type RedirectTime = string | number | null;

/** A provider-independent redirect entry. */
export interface Redirect {
  /** Source path, optionally including an exact query string. */
  from: string;
  /** Destination path or absolute HTTP(S) URL. */
  to: string;
  /** HTTP redirect status. Defaults to 302. */
  statusCode?: 301 | 302 | 307 | 308;
  /** Whether the origin is matched exactly or as a route pattern. */
  match?: "exact" | "pattern";
  /** The inclusive activation time, when the redirect is scheduled. */
  activeFrom?: RedirectTime;
  /** The exclusive expiration time, when the redirect is time-limited. */
  activeUntil?: RedirectTime;
}

/** A normalized redirect with an explicit status code. */
export type ResolvedRedirect = Omit<Redirect, "statusCode"> & {
  statusCode: 301 | 302 | 307 | 308;
};

/** Redirects keyed by their normalized origin. */
export type RedirectIndex = Record<string, ResolvedRedirect>;

/** A serializable, compiled-at-runtime dynamic redirect definition. */
export interface DynamicRedirectRule {
  /** Route pattern matched against the request pathname. */
  from: string;
  /** Destination template interpolated with captured route parameters. */
  to: string;
  /** HTTP redirect status. */
  statusCode: 301 | 302 | 307 | 308;
  /** Identifies this rule as a dynamic pattern. */
  match: "pattern";
  /** The inclusive activation time, when the redirect is scheduled. */
  activeFrom?: RedirectTime;
  /** The exclusive expiration time, when the redirect is time-limited. */
  activeUntil?: RedirectTime;
}

/** A consumer-defined asynchronous source of redirect records. */
export type RedirectSource = (event?: H3Event) => Promise<Redirect[]> | Redirect[];
