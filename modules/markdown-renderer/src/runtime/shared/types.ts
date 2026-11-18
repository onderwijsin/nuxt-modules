/** One persisted CMS selection, retaining string or numeric primary keys. */
export interface RelatedItem {
  /** Source collection name. */
  collection: string;
  /** Source item primary key. */
  item: string | number;
  /** Source display label. */
  label?: string;
  /** Collection-specific source snapshot supplied by the CMS. */
  data?: Record<string, unknown>;
}

/** Display fields shared by the item-list components. */
export interface ItemListItem {
  /** Image URL; takes precedence over the icon. */
  image?: string;
  /** Item title. */
  title?: string;
  /** Supporting text below the title. */
  description?: string;
  /** Link destination, either an internal path or a full URL. */
  to?: string;
  /** Whether to open the destination as an external link in a new tab. */
  external?: boolean;
  /** Iconify icon name, displayed when no image is provided. */
  icon?: string;
}

/** Maps a CMS selection to display fields; the title defaults to the source label. */
export type MapRelatedItem = (item: RelatedItem) => Omit<ItemListItem, "to">;

/** Resolves a CMS selection's destination, or leaves the row unlinked. */
export type ResolveRelatedItemPath = (item: RelatedItem) => string | undefined;

export type ResolveReferencePath = (
  collection: string,
  item: string,
  label?: string,
  text?: string,
  data?: Record<string, unknown>
) => string | undefined;
