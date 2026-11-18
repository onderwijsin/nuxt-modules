import type { ResolveReferencePath } from "../../../../../src/runtime/shared/types";

const resolveReferencePath: ResolveReferencePath = (collection, item, _label, _text, data) => {
  if (collection !== "articles") return undefined;
  const slug = typeof data?.slug === "string" ? data.slug : item;
  return `/articles/${encodeURIComponent(slug)}`;
};

export default resolveReferencePath;
