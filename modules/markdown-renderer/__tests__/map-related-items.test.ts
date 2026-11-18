import { describe, expect, it, vi } from "vitest";
import { mapRelatedItems } from "../src/runtime/app/utils/map-related-items";
import mapItem from "../src/runtime/app/utils/map-related-item";
import linkResolver from "../src/runtime/app/utils/resolve-related-item-path";
import type { RelatedItem } from "../src/runtime/shared/types";

const selections: RelatedItem[] = [
  {
    collection: "articles",
    item: "article-7",
    label: "Becoming a teacher",
    data: {
      slug: "becoming-a-teacher",
      summary: "Explore the routes into teaching.",
      image: "image-uuid"
    }
  },
  {
    collection: "programs",
    item: 42,
    label: "Teaching traineeship",
    data: { slug: "teaching-traineeship", duration: 24 }
  }
];
const defaultConfig = { mapItem, linkResolver };

describe("related item mapping", () => {
  it("keeps labels and source order without inventing links or snapshot mappings", () => {
    expect(mapRelatedItems(selections, defaultConfig)).toEqual([
      { title: "Becoming a teacher", to: undefined },
      { title: "Teaching traineeship", to: undefined }
    ]);
    expect(mapRelatedItems([], defaultConfig)).toEqual([]);
  });

  it("maps snapshots and resolves links with the full selection, including numeric IDs", () => {
    const linkResolver = vi.fn((item: RelatedItem) =>
      item.collection === "articles"
        ? `/articles/${String(item.data?.slug)}`
        : `/programs/${item.item}`
    );
    expect(
      mapRelatedItems(selections, {
        mapItem(item) {
          if (item.collection === "articles") {
            return {
              description: String(item.data?.summary),
              image: `/assets/${String(item.data?.image)}`
            };
          }
          return {
            title: "Traineeship",
            description: `${String(item.data?.duration)} months`,
            icon: "i-lucide-graduation-cap"
          };
        },
        linkResolver
      })
    ).toEqual([
      {
        title: "Becoming a teacher",
        description: "Explore the routes into teaching.",
        image: "/assets/image-uuid",
        to: "/articles/becoming-a-teacher"
      },
      {
        title: "Traineeship",
        description: "24 months",
        icon: "i-lucide-graduation-cap",
        to: "/programs/42"
      }
    ]);
    expect(linkResolver).toHaveBeenNthCalledWith(2, selections[1]);
    expect(selections[0]?.data?.image).toBe("image-uuid");
  });

  it("allows missing snapshots and leaves unsupported selections unlinked", () => {
    expect(
      mapRelatedItems([{ collection: "pages", item: 0 }], { linkResolver: () => undefined })
    ).toEqual([{ title: undefined, to: undefined }]);
  });
});
