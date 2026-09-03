import { z } from "zod";
import { directusCommandsSchema } from "./commands";
// Registers the shared Zod sensitivity method used below.
import "./sensitive";
import { directusTypegenSchema } from "./typegen";

const localPath = z
  .string()
  .regex(/^\/[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*$/)
  .refine(
    (value) =>
      value !== "/" && !value.split("/").some((segment) => segment === "." || segment === ".."),
    "must not contain traversal segments"
  )
  .refine(
    (value) => value !== "/_directus/auth" && !value.startsWith("/_directus/auth/"),
    "collides with the reserved /_directus/auth route prefix"
  );

/**
 * Zod schema for Directus proxy configuration.
 */
const proxySchema = z.strictObject({ path: localPath }).default({ path: "/_directus/proxy" });

const assetCacheSchema = z.discriminatedUnion("enabled", [
  z.strictObject({ enabled: z.literal(false) }),
  z.strictObject({
    enabled: z.literal(true),
    storage: z.string().trim().min(1),
    maxAge: z.number().int().positive(),
    maxBodySize: z
      .number()
      .int()
      .positive()
      .default(10 * 1024 * 1024),
    swr: z.boolean().default(false),
    staleMaxAge: z.number().int().nonnegative().optional()
  })
]);

/** Resolved Directus asset-cache options produced by the shared schema. */
export type ResolvedDirectusAssetCacheOptions = z.output<typeof assetCacheSchema>;

/** Zod schema for the dedicated Directus assets proxy configuration. */
const assetsSchema = z
  .strictObject({
    enabled: z.boolean().default(true),
    path: localPath.default("/_directus/assets"),
    publicOnly: z.boolean().default(false).sensitive(),
    cache: assetCacheSchema.prefault({ enabled: false }).sensitive()
  })
  .default({
    enabled: true,
    path: "/_directus/assets",
    publicOnly: false,
    cache: { enabled: false }
  });

/**
 * Default values for the previewSchema
 */
const directusPreviewSchemaDefaults = {
  enabled: true,
  versioning: true,
  queryKeys: {
    preview: "preview",
    token: "token",
    version: "version",
    id: "id"
  }
} as const;

/**
 * Zod schema for version preview fetching
 */
const directusPreviewSchema = z
  .strictObject({
    enabled: z.boolean().default(directusPreviewSchemaDefaults.enabled),
    versioning: z.boolean().default(directusPreviewSchemaDefaults.versioning),
    queryKeys: z
      .strictObject({
        preview: z.string().min(1).default(directusPreviewSchemaDefaults.queryKeys.preview),
        token: z.string().min(1).default(directusPreviewSchemaDefaults.queryKeys.token),
        version: z.string().min(1).default(directusPreviewSchemaDefaults.queryKeys.version),
        id: z.string().min(1).default(directusPreviewSchemaDefaults.queryKeys.id)
      })
      .default(directusPreviewSchemaDefaults.queryKeys)
  })
  .default(directusPreviewSchemaDefaults);

/**
 * Default values for the directusCookieSchema
 */
const directusCookieSchemaDefaults = {
  name: "directus_session",
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: 2_592_000
} as const;

/**
 * Zod schema for Directus cookie configuration.
 */

const directusCookieSchema = z
  .strictObject({
    name: z
      .string()
      .regex(/^[A-Za-z0-9_-]+$/)
      .default(directusCookieSchemaDefaults.name),
    secure: z.boolean().default(directusCookieSchemaDefaults.secure),
    sameSite: z.enum(["lax", "strict", "none"]).default(directusCookieSchemaDefaults.sameSite),
    path: localPath.or(z.literal("/")).default(directusCookieSchemaDefaults.path),
    maxAge: z.number().int().positive().default(directusCookieSchemaDefaults.maxAge),
    domain: z.string().min(1).optional()
  })
  .default(directusCookieSchemaDefaults);

/**
 * Default values for the directusAuthSchema
 */
const directusAuthSchemaDefaults = {
  enabled: false,
  turnstile: { enabled: false },
  magicLinks: { enabled: false },
  cookie: directusCookieSchemaDefaults,
  refreshSafetyWindow: 30_000,
  refreshAttempts: 3,
  previousSessionSecrets: [] as string[],
  maskSecretsInPlayground: true
} as const;

/**
 * Zod schema for Directus authentication configuration.
 */
const directusAuthSchema = z
  .strictObject({
    enabled: z.boolean().default(directusAuthSchemaDefaults.enabled),
    turnstile: z
      .object({ enabled: z.boolean().default(directusAuthSchemaDefaults.turnstile.enabled) })
      .default(directusAuthSchemaDefaults.turnstile),
    magicLinks: z
      .strictObject({
        enabled: z.boolean().default(directusAuthSchemaDefaults.magicLinks.enabled),
        redirectUrl: z.url().optional().sensitive()
      })
      .default(directusAuthSchemaDefaults.magicLinks),
    cookie: directusCookieSchema.sensitive(),
    refreshSafetyWindow: z
      .number()
      .int()
      .nonnegative()
      .default(directusAuthSchemaDefaults.refreshSafetyWindow)
      .sensitive(),
    refreshAttempts: z
      .number()
      .int()
      .positive()
      .default(directusAuthSchemaDefaults.refreshAttempts)
      .sensitive(),
    sessionSecret: z.string().min(32).optional().sensitive(),
    previousSessionSecrets: z.array(z.string().min(32)).default([]).sensitive(),
    maskSecretsInPlayground: z
      .boolean()
      .default(directusAuthSchemaDefaults.maskSecretsInPlayground),
    passwordResetUrl: z.url().optional().sensitive()
  })
  .default(directusAuthSchemaDefaults)
  .superRefine((options, context) => {
    if (options.magicLinks.enabled && !options.enabled) {
      context.addIssue({
        code: "custom",
        path: ["magicLinks", "enabled"],
        message: "client.auth.magicLinks.enabled requires client.auth.enabled"
      });
    }
    if (options.magicLinks.enabled && !options.magicLinks.redirectUrl) {
      context.addIssue({
        code: "custom",
        path: ["magicLinks", "redirectUrl"],
        message: "client.auth.magicLinks.redirectUrl is required when magic links are enabled"
      });
    }
  });

/** Shared Directus client settings excluding instance credentials. */
export const directusClientSchema = z.strictObject({
  proxy: proxySchema,
  assets: assetsSchema,
  commands: z.array(directusCommandsSchema).default(["readItem", "readItems"]).sensitive(),
  preview: directusPreviewSchema,
  auth: directusAuthSchema,
  typegen: directusTypegenSchema.sensitive()
});

/** Input type accepted by the shared client schema. */
export type DirectusClientOptions = z.input<typeof directusClientSchema>;
/** Resolved type produced by the shared client schema. */
export type ResolvedDirectusClientOptions = z.output<typeof directusClientSchema>;
