/** Configuration for the text module. */
export interface ModuleOptions {
  /** Indicates whether the module runtime should be registered. */
  enabled?: boolean;
  /** Path relative to the Nuxt app directory, without a required extension. */
  content?: string;
}
