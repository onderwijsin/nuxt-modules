import { readMe, type DirectusUser, type Query } from "@directus/sdk";
import type { H3Event } from "h3";
import { createError, setResponseHeader } from "h3";
import { useRuntimeConfig } from "#imports";
import directusConfig from "#directus-config-server";
import type { Schema } from "#directus";
import type { DirectusUserMapperInput } from "@onderwijsin/nuxt-directus-config/schema";
import { createDirectusRestClient } from "@onderwijsin/nuxt-module-utils/shared";
import { hasKey, isArray, isBoolean, isRecord } from "@onderwijsin/nuxt-module-utils/shared";
import { ofetch } from "ofetch";
import type { DirectusUserProjection } from "#directus-user";

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value) || isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Resolves the authenticated, configured current-user projection for one request.
 * @param event Incoming H3 request event.
 * @param runtimeConfig Optional Nuxt runtime configuration captured by the SSR plugin.
 * @returns The validated raw or mapped current-user projection.
 */
export async function resolveDirectusUser(
  event: H3Event,
  runtimeConfig?: ReturnType<typeof useRuntimeConfig>
): Promise<DirectusUserProjection> {
  const authState = await event.context.directusAuth?.resolve();
  if (!authState?.accessToken) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const runtime = (runtimeConfig ?? useRuntimeConfig(event)).directusClient;
  const runtimeUserConfig =
    isRecord(runtime.auth) && hasKey(runtime.auth, "user") && isRecord(runtime.auth.user)
      ? runtime.auth.user
      : undefined;
  const fields =
    runtimeUserConfig &&
    hasKey(runtimeUserConfig, "enabled") &&
    isBoolean(runtimeUserConfig.enabled) &&
    runtimeUserConfig.enabled &&
    hasKey(runtimeUserConfig, "fields") &&
    isArray(runtimeUserConfig.fields)
      ? runtimeUserConfig.fields
      : [];
  const client = createDirectusRestClient<Schema>({
    baseUrl: runtime.baseUrl,
    accessToken: authState.accessToken,
    fetch: ofetch
  });
  const raw = await client.request(
    readMe<Schema, Query<Schema, DirectusUser<Schema>>>({
      fields: fields as Query<Schema, DirectusUser<Schema>>["fields"]
    })
  );
  if (!isPlainRecord(raw)) {
    throw createError({ statusCode: 502, statusMessage: "Invalid Directus user response" });
  }

  let mapped: unknown = raw;
  const mapperEnabled =
    runtimeUserConfig &&
    hasKey(runtimeUserConfig, "mapperEnabled") &&
    runtimeUserConfig.mapperEnabled === true;
  const sharedUserConfig = directusConfig.client?.auth?.user;
  const mapper = mapperEnabled && sharedUserConfig?.enabled ? sharedUserConfig.mapper : undefined;
  if (typeof mapper === "function") {
    mapped = mapper(raw as unknown as DirectusUserMapperInput);
  }
  if (!isPlainRecord(mapped)) {
    throw createError({ statusCode: 502, statusMessage: "Invalid mapped Directus user response" });
  }
  return mapped as DirectusUserProjection;
}

/**
 * Resolves the current user and marks the response as private and non-cacheable.
 * @param event Incoming H3 request event.
 * @returns The current-user projection response.
 */
export async function resolveDirectusUserResponse(event: H3Event) {
  setResponseHeader(event, "cache-control", "private, no-store");
  return resolveDirectusUser(event);
}
