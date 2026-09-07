import { readMe, type DirectusUser, type Query } from "@directus/sdk";
import type { H3Event } from "h3";
import { createError, setResponseHeader } from "h3";
import { useRuntimeConfig } from "#imports";
import config from "#directus-config-server";
import type { Schema } from "#directus";
import { createDirectusRestClient } from "@onderwijsin/nuxt-module-utils/shared";
import { hasKey, isArray, isBoolean, isRecord } from "@onderwijsin/nuxt-module-utils/shared";
import { ofetch } from "ofetch";
import type { DirectusUserProjection } from "#directus-user";

/**
 * Resolves the authenticated, configured current-user projection for one request.
 * @param event Incoming H3 request event.
 * @returns The validated raw or mapped current-user projection.
 */
export async function resolveDirectusUser(event: H3Event): Promise<DirectusUserProjection> {
  const authState = await event.context.directusAuth?.resolve();
  if (!authState?.accessToken) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const runtime = useRuntimeConfig(event).directusClient;
  const userConfig =
    isRecord(runtime.auth) && hasKey(runtime.auth, "user") && isRecord(runtime.auth.user)
      ? runtime.auth.user
      : undefined;
  const fields =
    userConfig &&
    hasKey(userConfig, "enabled") &&
    isBoolean(userConfig.enabled) &&
    userConfig.enabled &&
    hasKey(userConfig, "fields") &&
    isArray(userConfig.fields)
      ? userConfig.fields
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
  if (!isRecord(raw)) {
    throw createError({ statusCode: 502, statusMessage: "Invalid Directus user response" });
  }

  const sharedUserConfig = config.client?.auth?.user;
  const mapped =
    sharedUserConfig && "mapper" in sharedUserConfig && sharedUserConfig.mapper
      ? sharedUserConfig.mapper(raw)
      : raw;
  if (!isRecord(mapped)) {
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
