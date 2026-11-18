import type { ResolveRelatedItemPath } from "@onderwijsin/nuxt-markdown-renderer/runtime";

const resolveRelatedItemPath: ResolveRelatedItemPath = (item) => {
  return typeof item.data?.slug === "string"
    ? `/articles/${encodeURIComponent(item.data.slug)}`
    : undefined;
};

export default resolveRelatedItemPath;
