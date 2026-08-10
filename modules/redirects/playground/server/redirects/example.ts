import { defineRedirectSource } from "@onderwijsin/nuxt-redirects/runtime/source";

export default defineRedirectSource(() => [
  { from: "/server-origin", to: "/server-destination", statusCode: 301 },
  { from: "/client-origin", to: "/client-destination", statusCode: 302 }
]);
