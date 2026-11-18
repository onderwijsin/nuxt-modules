import type { ResolveRelatedItemPath } from "@onderwijsin/nuxt-markdown-renderer/runtime";

const resolveRelatedItemPath: ResolveRelatedItemPath = (item) => {
  const slug = item.data?.slug;
  if (typeof slug !== "string") return undefined;
  return `/${item.collection}/${encodeURIComponent(slug)}`;
};

export default resolveRelatedItemPath;
