import { useOverlay } from "#imports";
import FormModal from "../components/FormModal.vue";
import type { FormModalProps } from "../types";

/**
 * Opens a reusable validated text form through Nuxt UI's overlay manager.
 * @returns A function that opens the form and resolves with the submitted value.
 */
export function useFormModal() {
  const overlay = useOverlay();

  return (options: FormModalProps): Promise<string | undefined> => {
    const modal = overlay.create(FormModal, {
      destroyOnClose: true,
      props: options
    });

    return modal.open() as Promise<string | undefined>;
  };
}
