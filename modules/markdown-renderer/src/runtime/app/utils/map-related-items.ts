import type {
  ItemListItem,
  MapRelatedItem,
  RelatedItem,
  ResolveRelatedItemPath
} from "../../shared/types";

/**
 * Maps persisted selections to display rows without changing their order.
 * @param items Persisted CMS selections.
 * @param config Consumer-owned display mapping and link resolver.
 * @returns Rows for the item-list renderer.
 */
export function mapRelatedItems(
  items: RelatedItem[],
  config: { mapItem?: MapRelatedItem; linkResolver?: ResolveRelatedItemPath }
): ItemListItem[] {
  return items.map((item) => ({
    title: item.label,
    ...config.mapItem?.(item),
    to: config.linkResolver?.(item)
  }));
}
