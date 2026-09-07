declare module "#directus-user" {
  export type DirectusUserProjection = Record<string, string | number | boolean | null | object>;
}

declare module "#directus-config-server" {
  const config: {
    client?: {
      auth?: {
        user?: {
          mapper?: (user: Record<string, unknown>) => Record<string, unknown>;
        };
      };
    };
  };
  export default config;
}

declare module "#directus-user-config-server" {
  const config:
    | {
        mapper?: (user: Record<string, unknown>) => Record<string, unknown>;
      }
    | undefined;
  export default config;
}
