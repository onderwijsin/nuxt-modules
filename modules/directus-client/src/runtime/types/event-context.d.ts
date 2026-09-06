import type { DirectusRequestAuthContext } from "../auth/types";

declare module "h3" {
  interface H3EventContext {
    directusAuth?: DirectusRequestAuthContext;
  }
}

export {};
