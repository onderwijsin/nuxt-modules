declare module "#markdown-renderer/manifest" {
  import type { ComponentManifest } from "comark";

  export const componentSets: Record<string, string[]>;
  export const rendererComponentNames: string[];
  export const resolveRendererComponent: (
    name: string,
    componentSet?: string
  ) => ReturnType<ComponentManifest>;
}

declare module "#markdown-renderer/reference-resolver" {
  import type { ResolveReferencePath } from "@onderwijsin/nuxt-markdown-renderer/runtime";

  const resolveReferencePath: ResolveReferencePath;
  export default resolveReferencePath;
}

export {};
