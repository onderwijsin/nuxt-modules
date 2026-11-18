import type { MapRelatedItem } from "@onderwijsin/nuxt-markdown-renderer/runtime";

const mapRelatedItem: MapRelatedItem = (item) => {
  const { summary, duration, image } = item.data ?? {};
  return {
    description:
      typeof summary === "string"
        ? summary
        : typeof duration === "number"
          ? `${duration} months`
          : undefined,
    image: typeof image === "string" ? image : undefined
  };
};

export default mapRelatedItem;
