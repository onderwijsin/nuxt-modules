export interface ModuleOptions {
  /** Whether the module is enabled. @default true */
  enabled?: boolean;
  /** Public site key consumed by the Turnstile widget. @default "" */
  siteKey?: string;
  /** Secret key used by server-side Turnstile verification. @default "" */
  secretKey?: string;
  /** Optional administrator token that bypasses Turnstile verification. @default "" */
  adminToken?: string;
  /** Header accepted for the administrator token. @default "x-admin-token" */
  adminHeaderName?: string;
}
