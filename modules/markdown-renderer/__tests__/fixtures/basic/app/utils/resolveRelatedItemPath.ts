import type { ResolveRelatedItemPath } from "../../../../../src/runtime/shared/types";

const resolveRelatedItemPath: ResolveRelatedItemPath = (item) => {
  if (typeof item.data?.slug !== "string") return undefined;
  return `/${item.collection}/${item.data.slug}`;
};

export default resolveRelatedItemPath;
