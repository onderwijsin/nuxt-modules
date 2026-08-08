import { hasKey } from "@onderwijsin/nuxt-module-utils/shared";
import { isAdmin } from "@onderwijsin/nuxt-module-utils/server";
import { createError } from "h3";
import type { H3Event } from "h3";
import { useRuntimeConfig, useStorage } from "nitropack/runtime";
import type { Storage } from "unstorage";

type Permission = "read" | "write" | "delete";

interface MountConfig {
  permissions: Permission[];
  prefixes: string[];
  allowRoot: boolean;
}

interface StorageAdminConfig {
  enabled: boolean;
  adminToken?: string;
  adminHeaderName: string;
  devAuthBypass: boolean;
  internalKeyPrefixes: string[];
  internalKeySuffixes: string[];
  mounts: Record<string, MountConfig>;
  ui: {
    enabled: boolean;
    path: string;
  };
  defaultLimit: number;
  maxLimit: number;
  maxListedKeys: number;
}

interface AllowedStorage {
  config: StorageAdminConfig;
  storage: Storage;
}

/**
 * Returns the validated storage-admin runtime configuration.
 * @param event - Current H3 request event.
 * @returns The enabled storage-admin configuration.
 */
export function getStorageAdminConfig(event: H3Event): StorageAdminConfig {
  const config = useRuntimeConfig(event).storageAdmin;
  if (!config?.enabled) {
    throw createError({ statusCode: 404, statusMessage: "Storage administration is unavailable" });
  }

  return config;
}

/**
 * Returns whether a request may skip authentication during local development.
 * @param isDevelopment Whether the runtime is a development build.
 * @param devAuthBypass Whether the consuming application explicitly enabled the bypass.
 * @returns Whether authentication may be bypassed.
 */
export function isDevelopmentAuthBypassEnabled(
  isDevelopment: boolean,
  devAuthBypass: boolean
): boolean {
  return isDevelopment && devAuthBypass;
}

/**
 * Requires a request to carry the configured administrator token.
 * @param event - Current H3 request event.
 * @param config - Storage-admin configuration to authenticate against.
 * @returns Nothing when the request is authorized.
 */
export function assertStorageAdmin(event: H3Event, config: StorageAdminConfig): void {
  if (isDevelopmentAuthBypassEnabled(import.meta.dev, config.devAuthBypass)) return;

  if (!isAdmin(event, config.adminToken, config.adminHeaderName)) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }
}

/**
 * Resolves an allowed mount and verifies the requested operation is permitted.
 * @param event - Current H3 request event.
 * @param mountName - Requested Nitro storage mount name.
 * @param permission - Operation required for the request.
 * @returns The active configuration and allowed mount configuration.
 */
export function getAllowedMount(
  event: H3Event,
  mountName: string,
  permission: Permission
): { config: StorageAdminConfig; mount: MountConfig } {
  const config = getStorageAdminConfig(event);
  assertStorageAdmin(event, config);

  const mount = hasKey(config.mounts, mountName) ? config.mounts[mountName] : undefined;
  if (!mount) {
    throw createError({ statusCode: 404, statusMessage: "Storage mount is not configured" });
  }
  if (!mount.permissions.includes(permission)) {
    throw createError({ statusCode: 403, statusMessage: "Storage operation is not permitted" });
  }

  return { config, mount };
}

/**
 * Validates that a key or prefix stays within the configured mount boundary.
 * @param config - Active storage-admin configuration.
 * @param mount - Configuration for the selected storage mount.
 * @param value - Key or prefix to validate.
 * @returns Nothing when the key or prefix is allowed.
 */
export function assertAllowedPrefix(
  config: StorageAdminConfig,
  mount: MountConfig,
  value: string
): void {
  if (isInternalStorageKey(config, value)) {
    throw createError({
      statusCode: 403,
      statusMessage: "Internal storage metadata is not exposed"
    });
  }

  if (!value) {
    if (mount.allowRoot) return;
    throw createError({
      statusCode: 403,
      statusMessage: "A configured storage prefix is required"
    });
  }

  const isAllowed = mount.prefixes.some(
    (prefix) => value === prefix || value.startsWith(`${prefix}:`)
  );
  if (!isAllowed) {
    throw createError({ statusCode: 403, statusMessage: "Storage prefix is not permitted" });
  }
}

/**
 * Returns whether a key is reserved for storage-driver metadata.
 * @param config - Active storage-admin configuration.
 * @param key - Storage key to inspect.
 * @returns Whether the key is internal metadata.
 */
export function isInternalStorageKey(config: StorageAdminConfig, key: string): boolean {
  return (
    config.internalKeyPrefixes.some((prefix) => key.startsWith(prefix)) ||
    config.internalKeySuffixes.some((suffix) => key.endsWith(suffix))
  );
}

/**
 * Returns the selected Nitro storage mount after all authorization checks pass.
 * @param event - Current H3 request event.
 * @param mountName - Requested Nitro storage mount name.
 * @param permission - Operation required for the request.
 * @param prefix - Key or prefix to authorize.
 * @returns The active configuration and selected Nitro storage mount.
 */
export function useAllowedStorage(
  event: H3Event,
  mountName: string,
  permission: Permission,
  prefix: string
): AllowedStorage {
  const { mount, config } = getAllowedMount(event, mountName, permission);
  assertAllowedPrefix(config, mount, prefix);
  return { config, storage: useStorage(mountName) };
}
