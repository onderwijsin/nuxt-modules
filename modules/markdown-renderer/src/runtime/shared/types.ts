export type ResolveReferencePath = (
  collection: string,
  item: string,
  label?: string,
  text?: string,
  data?: Record<string, unknown>
) => string | undefined;
