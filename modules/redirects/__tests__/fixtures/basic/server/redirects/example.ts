import { defineRedirectSource } from "../../../../../src/runtime/source";

export default defineRedirectSource(() => [
  { from: "/server-origin", to: "/server-destination?from=redirect", statusCode: 301 },
  { from: "/client-origin", to: "docs.example.com/redirects?source=client", statusCode: 302 },
  { from: "/search?q=old", to: "/search-archive?source=redirect", statusCode: 308 },
  { from: "/foo-bar", to: "/hyphenated" },
  { from: "/foobar", to: "/plain" },
  { from: "/self-slash", to: "/self-slash/" },
  { from: "/self-no-slash/", to: "/self-no-slash" },
  {
    from: "/refresh-origin",
    to: process.env.REDIRECTS_TEST_REFRESH_DESTINATION ?? "/refresh-first"
  }
]);
