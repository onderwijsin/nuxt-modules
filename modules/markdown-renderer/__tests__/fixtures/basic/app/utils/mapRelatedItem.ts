import type { MapRelatedItem } from "../../../../../src/runtime/shared/types";

const mapRelatedItem: MapRelatedItem = (item) => {
  return {
    description:
      item.collection === "articles"
        ? String(item.data?.summary ?? "")
        : `${String(item.data?.duration)} months`,
    image: typeof item.data?.image === "string" ? `/assets/${item.data.image}` : undefined
  };
};

export default mapRelatedItem;
