import ThemeCustomizerConfirmation from "../components/ThemeCustomizerConfirmation.vue";
import type { ConfirmDialogProps } from "../types";
import { useOverlay } from "#imports";

/**
 * Creates confirmation dialogs through Nuxt UI's overlay manager.
 * @returns A function that opens a dialog and resolves with the user's decision.
 */
export function useThemeCustomizerConfirmDialog() {
  const overlay = useOverlay();

  return (options: ConfirmDialogProps): Promise<boolean> => {
    const modal = overlay.create(ThemeCustomizerConfirmation, {
      destroyOnClose: true,
      props: options
    });

    return modal.open();
  };
}
