import { useOverlay } from "@nuxt/ui/composables";

import Confirmation from "../components/Confirmation.vue";
import type { ConfirmDialogProps } from "../types";

/**
 * Creates confirmation dialogs through Nuxt UI's overlay manager.
 * @returns A function that opens a dialog and resolves with the user's decision.
 */
export function useConfirmDialog() {
  const overlay = useOverlay();

  return (options: ConfirmDialogProps): Promise<boolean> => {
    const modal = overlay.create(Confirmation, {
      destroyOnClose: true,
      props: options
    });

    return modal.open();
  };
}
