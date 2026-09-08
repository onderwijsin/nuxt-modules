import { readMe, type DirectusUser, type Query } from "@directus/sdk";
import { createError, defineEventHandler, setResponseHeader } from "h3";
import { useRuntimeConfig } from "#imports";
import type { DirectusUserMapperInput } from "@onderwijsin/nuxt-directus-config/schema";
import { createDirectusRestClient } from "@onderwijsin/nuxt-module-utils/shared";
import { ofetch } from "ofetch";
import type { Schema } from "#directus";

type UserMapper = (user: DirectusUserMapperInput) => unknown;

/**
 * Creates the current-user handler with the optional executable application mapper.
 * @param mapper Optional server-side mapper.
 * @returns A Nitro handler for the current-user route.
 */
export function createDirectusUserHandler(mapper?: UserMapper) {
  return defineEventHandler(async (event) => {
    setResponseHeader(event, "cache-control", "private, no-store");

    const auth = await event.context.directusAuth?.resolve();
    if (!auth?.accessToken) throw createError({ statusCode: 401, statusMessage: "Unauthorized" });

    const config = useRuntimeConfig(event).directusClient;
    const fields = config.auth.user.enabled ? config.auth.user.fields : [];
    const client = createDirectusRestClient<Schema>({
      baseUrl: config.baseUrl,
      accessToken: auth.accessToken,
      fetch: ofetch
    });
    const user = await client.request(
      readMe<Schema, Query<Schema, DirectusUser<Schema>>>({
        fields: fields as Query<Schema, DirectusUser<Schema>>["fields"]
      })
    );

    return mapper ? mapper(user as unknown as DirectusUserMapperInput) : user;
  });
}
