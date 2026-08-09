import type { H3Event } from "h3";

/** A provider-independent redirect entry. */
export interface Redirect {
  /** Source path, optionally including an exact query string. */
  from: string;
  /** Destination path or absolute HTTP(S) URL. */
  to: string;
  /** HTTP redirect status. Defaults to 302. */
  statusCode?: 301 | 302 | 307 | 308;
}

/** A normalized redirect with an explicit status code. */
export type ResolvedRedirect = Required<Redirect>;

/** Redirects keyed by their normalized origin. */
export type RedirectIndex = Record<string, ResolvedRedirect>;

/** A consumer-defined asynchronous source of redirect records. */
export type RedirectSource = (event?: H3Event) => Promise<Redirect[]> | Redirect[];
