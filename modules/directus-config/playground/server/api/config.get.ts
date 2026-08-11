import directusConfig from "#directus-config-server";

export default defineEventHandler(() => {
  return directusConfig;
});
