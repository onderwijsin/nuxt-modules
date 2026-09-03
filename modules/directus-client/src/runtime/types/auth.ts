/** Token-free user data projected into Nuxt application state. */
export interface DirectusSessionSnapshot {
  readonly userId: string;
  readonly email: string | null;
  readonly firstName: string | null;
  readonly lastName: string | null;
  /** Whether Directus requires this session to complete TFA setup. */
  readonly requiresTfaSetup: boolean;
}

/** Request-local Directus authentication state prepared by Nitro. */
export interface DirectusRequestAuthContext {
  readonly accessToken?: string;
  readonly snapshot: DirectusSessionSnapshot | null;
}
