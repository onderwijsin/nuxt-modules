import type { MapRelatedItem } from "@onderwijsin/nuxt-markdown-renderer/runtime";

const mapRelatedItem: MapRelatedItem = (item) => {
  return { description: typeof item.data?.summary === "string" ? item.data.summary : undefined };
};

export default mapRelatedItem;
