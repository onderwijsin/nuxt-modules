import type { ResolveReferencePath } from "@onderwijsin/nuxt-markdown-renderer/runtime";

const resolveReferencePath: ResolveReferencePath = (collection, item) => {
  if (collection === "events") return `/events/${encodeURIComponent(item)}`;
  return undefined;
};

export default resolveReferencePath;
