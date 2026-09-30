import type { ResolveReferencePath } from "@onderwijsin/nuxt-markdown-renderer/runtime";

const resolveReferencePath: ResolveReferencePath = (collection, item, _label, _text, data) => {
  return `/${collection}/${String(data?.id ?? item)}`;
};

export default resolveReferencePath;
