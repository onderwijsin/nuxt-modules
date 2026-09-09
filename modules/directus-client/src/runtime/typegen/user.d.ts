/** Build-time fallback replaced by the consumer-specific generated declaration. */
declare module "#directus-user" {
  /** Directus user shape selected before an optional server mapper runs. */
  export type SelectedDirectusUser = Record<string, unknown>;

  /** Current-user response returned to the consuming application. */
  export type DirectusUserResponse = Record<string, unknown>;
}
