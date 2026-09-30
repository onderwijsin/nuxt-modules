import type { ResolveReferencePath } from "../../shared/types";

/**
 * Default reference resolver used when the consuming application does not configure one.
 * @returns No route because route semantics belong to the consuming application.
 */
const resolveReferencePath: ResolveReferencePath = () => undefined;

export default resolveReferencePath;
