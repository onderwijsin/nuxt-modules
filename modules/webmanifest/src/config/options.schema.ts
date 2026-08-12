import { z } from "zod";
import { enabled } from "@onderwijsin/nuxt-module-utils/build";

export const webManifestIconSchema = z.object({
  src: z.string().trim().min(1),
  sizes: z.string().trim().min(1).optional(),
  type: z.string().trim().min(1).optional(),
  purpose: z.enum(["any", "maskable", "monochrome"]).optional()
});

export const webManifestScreenshotSchema = z.object({
  src: z.string().trim().min(1),
  sizes: z.string().trim().min(1).optional(),
  type: z.string().trim().min(1).optional(),
  form_factor: z.enum(["wide", "narrow"]).optional(),
  label: z.string().optional(),
  platform: z.string().optional()
});

export const webManifestShortcutSchema = z.object({
  name: z.string().trim().min(1),
  short_name: z.string().trim().min(1).optional(),
  description: z.string().optional(),
  url: z.string().trim().min(1),
  icons: z.array(webManifestIconSchema).optional()
});

export const webManifestProtocolHandlerSchema = z.object({
  protocol: z.string().trim().min(1),
  url: z.string().trim().min(1)
});

export const webManifestSchema = z
  .object({
    name: z.string().optional(),
    short_name: z.string().optional(),
    description: z.string().optional(),
    lang: z.string().optional(),
    dir: z.enum(["ltr", "rtl", "auto"]).optional(),
    start_url: z.string().optional(),
    display: z.enum(["fullscreen", "standalone", "minimal-ui", "browser"]).optional(),
    orientation: z
      .enum([
        "any",
        "natural",
        "landscape",
        "landscape-primary",
        "landscape-secondary",
        "portrait",
        "portrait-primary",
        "portrait-secondary"
      ])
      .optional(),
    theme_color: z.string().optional(),
    background_color: z.string().optional(),
    scope: z.string().optional(),
    launch_handler: z
      .object({ route_to: z.enum(["existing-client", "new-client"]).optional() })
      .optional(),
    icons: z.array(webManifestIconSchema).optional(),
    screenshots: z.array(webManifestScreenshotSchema).optional(),
    categories: z.array(z.string()).optional(),
    shortcuts: z.array(webManifestShortcutSchema).optional(),
    protocol_handlers: z.array(webManifestProtocolHandlerSchema).optional(),
    related_applications: z.array(z.record(z.string(), z.unknown())).optional(),
    prefer_related_applications: z.boolean().optional()
  })
  .catchall(z.unknown());

/** Runtime validation schema for webmanifest module options. */
export const webmanifestOptionsSchema = z.strictObject({
  enabled,
  icons: z
    .object({
      favicon: z.string().trim().min(1).optional(),
      appIcon: z.string().trim().min(1).optional(),
      maskableAppIcon: z.string().trim().min(1).optional()
    })
    .optional(),
  manifest: webManifestSchema.optional()
});

export type WebManifest = z.infer<typeof webManifestSchema>;
export type WebManifestIcon = z.infer<typeof webManifestIconSchema>;
export type WebManifestScreenshot = z.infer<typeof webManifestScreenshotSchema>;
export type WebManifestShortcut = z.infer<typeof webManifestShortcutSchema>;
export type WebManifestProtocolHandler = z.infer<typeof webManifestProtocolHandlerSchema>;
export type ModuleOptions = z.input<typeof webmanifestOptionsSchema>;
export type ResolvedModuleOptions = z.output<typeof webmanifestOptionsSchema>;
