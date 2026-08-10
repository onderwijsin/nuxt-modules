import { defineRedirectSource } from "@onderwijsin/nuxt-redirects/runtime/source";

export default defineRedirectSource(() => [{ from: "/redirect-sanity", to: "/", statusCode: 302 }]);
