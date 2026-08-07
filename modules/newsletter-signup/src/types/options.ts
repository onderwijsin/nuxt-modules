/** Supported newsletter providers. */
export type NewsletterProvider = "loops" | "mailchimp";

/** A configured selectable newsletter list. */
export interface NewsletterListOption {
  /** Label shown to the visitor. */
  label: string;
  /** Provider-specific list or audience identifier. */
  id: string;
  /** Mailchimp server value for this audience. */
  server?: string;
}

/** Configuration for one accepted input field. */
export interface NewsletterFieldConfig {
  /** Provider-specific target property. Defaults are provider-dependent. */
  target?: string;
  /** Whether the field is required by the generated endpoint. */
  required?: boolean;
}

/** Configuration for the generated server handler and client request URL. */
export interface NewsletterEndpointConfig {
  /** Registers the local `POST /api/newsletter/signup` handler. */
  enabled?: boolean;
  /** URL used by `useNewsletterSignup().signup`, local or remote. */
  url?: string;
}

/** Newsletter signup module options. */
export interface ModuleOptions {
  /** Indicates whether the module runtime should be registered. */
  enabled?: boolean;
  /** Provider used by the server adapter. */
  provider?: NewsletterProvider;
  /** Provider API key. This value is used only by the server runtime and is never exposed to clients. */
  apiKey?: string;
  /** Controls local handler registration and the client-facing signup URL. */
  endpoint?: NewsletterEndpointConfig;
  /** Mailchimp server value associated with the configured audiences, for example `us4`. */
  server?: string;
  /** Default and selectable provider list identifiers. */
  lists?: {
    default?: string;
    options?: NewsletterListOption[];
  };
  /** Accepted field configuration. Unknown fields are not supported. */
  fields?: {
    email?: NewsletterFieldConfig;
    firstName?: NewsletterFieldConfig;
    lastName?: NewsletterFieldConfig;
    organization?: NewsletterFieldConfig;
    source?: NewsletterFieldConfig;
  };
}
