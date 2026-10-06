import { useRuntimeConfig } from "#imports";

export default async () => {
  useRuntimeConfig();
  return [{ from: "/redirect-sanity", to: "/", statusCode: 302 }];
};
