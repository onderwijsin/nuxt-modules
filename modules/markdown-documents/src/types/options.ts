/** Configuration for server-owned Markdown document definitions. */
export interface ModuleOptions {
  /** Enable definition discovery and server registration. @default true */
  enabled?: boolean;
  /** Definition directory relative to rootDir; layers are not merged. @default "server/documents" */
  dir?: string;
  /** Raw Markdown delivery prefix; omit or use null for /:path.md. @default undefined */
  rawPrefix?: string | null;
  /** Response MIME type; request headers do not override it. @default "plain" */
  contentType?: "plain" | "markdown";
}
