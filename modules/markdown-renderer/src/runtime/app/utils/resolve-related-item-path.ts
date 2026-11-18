import type { ResolveRelatedItemPath } from "../../shared/types";

/**
 * Leaves related rows unlinked until the consumer defines its route semantics.
 * @returns No destination.
 */
const resolveRelatedItemPath: ResolveRelatedItemPath = () => undefined;

export default resolveRelatedItemPath;
