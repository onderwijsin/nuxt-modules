import { computed, inject, provide, type ComputedRef, type InjectionKey } from "vue";
import type { LoopsLmxElement } from "@onderwijsin/loops-core";
import type { LoopsRendererConfig } from "../../types";
import { resolveLoopsRendererStyles } from "../utils/styles";

const backgroundKey: InjectionKey<ComputedRef<string | undefined>> = Symbol("loops-background");

/** Starts an independent AST background context, including for nested renderer instances. */
export function resetLoopsRendererBackground(): void {
  provide(
    backgroundKey,
    computed(() => undefined)
  );
}

/**
 * Resolves reactive styles and provides authored background context to descendant nodes.
 *
 * @param node - Styled element getter; undefined lets dispatch components pass context through.
 * @param config - Reactive runtime configuration getter.
 * @returns Computed inline styles with consumer color mappings applied.
 */
export function useLoopsNodeStyles(
  node: () => LoopsLmxElement | undefined,
  config: () => LoopsRendererConfig
) {
  const parentBackground = inject(backgroundKey, undefined);
  const resolved = computed(() => {
    const element = node();
    const parent = parentBackground?.value;
    return element
      ? resolveLoopsRendererStyles(element, config(), parent)
      : { styles: {}, backgroundColor: parent };
  });
  provide(
    backgroundKey,
    computed(() => resolved.value.backgroundColor)
  );
  return computed(() => resolved.value.styles);
}
