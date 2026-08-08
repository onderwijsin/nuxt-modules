import { enabled } from "@onderwijsin/nuxt-module-utils/shared";
import { z } from "zod";

const permissionSchema = z.enum(["read", "write", "delete"]);
const storageKeySchema = z.string().trim().min(1).max(512);
const internalKeyPatternSchema = z.string().trim().min(1).max(512);
const uiPathSchema = z
  .string()
  .trim()
  .min(2)
  .max(200)
  .refine((path) => path.startsWith("/"), { message: "must start with /" });

/** Validates one storage mount exposed through the admin API. */
const mountOptionsSchema = z
  .strictObject({
    permissions: z.array(permissionSchema).min(1),
    prefixes: z.array(storageKeySchema).default([]),
    allowRoot: z.boolean().default(false)
  })
  .refine((mount) => mount.allowRoot || mount.prefixes.length > 0, {
    message: "must set allowRoot to true or configure at least one prefix"
  });

/** Runtime validation schema for the public storage-admin module options. */
export const storageAdminOptionsSchema = z.strictObject({
  enabled: enabled.default(false),
  adminToken: z.string().trim().min(1).optional(),
  adminHeaderName: z.string().trim().min(1).default("x-admin-token"),
  internalKeyPrefixes: z.array(internalKeyPatternSchema).default(["__cache_meta:"]),
  internalKeySuffixes: z.array(internalKeyPatternSchema).default(["$"]),
  mounts: z.record(z.string().trim().min(1), mountOptionsSchema).default({}),
  ui: z
    .strictObject({
      enabled: z.boolean().default(true),
      path: uiPathSchema.default("/_storage")
    })
    .default({ enabled: true, path: "/_storage" }),
  defaultLimit: z.number().int().positive().max(500).default(100),
  maxLimit: z.number().int().positive().max(1000).default(500),
  maxScanKeys: z.number().int().positive().max(100_000).default(10_000),
  metadataConcurrency: z.number().int().positive().max(50).default(8),
  listTimeoutMs: z.number().int().min(100).max(60_000).default(10_000)
});

export type StorageAdminOptionsSchema = typeof storageAdminOptionsSchema;
