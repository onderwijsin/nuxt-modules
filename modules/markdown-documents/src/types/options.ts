/** Configuration for server-owned Markdown document definitions. */
export interface ModuleOptions {
  /** Enable definition discovery and server registration. @default true */
  enabled?: boolean;
  /** Definition directory relative to rootDir; layers are not merged. @default "server/documents" */
  dir?: string;
  /** Raw Markdown delivery prefix; omit or use null for /:path.md. @default undefined */
  rawPrefix?: string | null;
  /** Default response type when the request has no supported preference. @default "plain" */
  contentType?: "plain" | "markdown";
  /** Reserved compatibility setting; no effect. Consumers configure prerendering. @default false */
  prerender?: boolean;
}
