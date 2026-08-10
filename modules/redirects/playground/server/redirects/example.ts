import { defineRedirectSource } from "@onderwijsin/nuxt-redirects/runtime/source";

export default defineRedirectSource(() => [
  { from: "/server-origin", to: "/server-destination", statusCode: 301 },
  { from: "/client-origin", to: "/client-destination", statusCode: 302 },
  {
    from: "/legacy/:section/:slug",
    to: "/dynamic-destination/:section/:slug",
    statusCode: 301,
    match: "pattern"
  },
  {
    from: "/files/*",
    to: "/dynamic-destination/files/*",
    statusCode: 302,
    match: "pattern"
  }
]);
