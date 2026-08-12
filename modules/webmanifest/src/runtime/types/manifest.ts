/** A Web App Manifest as defined by the W3C application manifest specification. */
export interface WebManifest {
  name?: string;
  short_name?: string;
  description?: string;
  lang?: string;
  dir?: "ltr" | "rtl" | "auto";
  start_url?: string;
  display?: "fullscreen" | "standalone" | "minimal-ui" | "browser";
  orientation?:
    | "any"
    | "natural"
    | "landscape"
    | "landscape-primary"
    | "landscape-secondary"
    | "portrait"
    | "portrait-primary"
    | "portrait-secondary";
  theme_color?: string;
  background_color?: string;
  scope?: string;
  launch_handler?: { route_to?: "existing-client" | "new-client" };
  icons?: WebManifestIcon[];
  screenshots?: WebManifestScreenshot[];
  categories?: string[];
  shortcuts?: WebManifestShortcut[];
  protocol_handlers?: WebManifestProtocolHandler[];
  related_applications?: Array<Record<string, unknown>>;
  prefer_related_applications?: boolean;
}

/** A manifest icon entry. */
export interface WebManifestIcon {
  src: string;
  sizes?: string;
  type?: string;
  purpose?: "any" | "maskable" | "monochrome";
}

/** A manifest screenshot entry. */
export interface WebManifestScreenshot {
  src: string;
  sizes?: string;
  type?: string;
  form_factor?: "wide" | "narrow";
  label?: string;
  platform?: string;
}

/** A quick action shown for an installed application. */
export interface WebManifestShortcut {
  name: string;
  short_name?: string;
  description?: string;
  url: string;
  icons?: WebManifestIcon[];
}

/** A custom URL protocol handled by the installed application. */
export interface WebManifestProtocolHandler {
  protocol: string;
  url: string;
}
