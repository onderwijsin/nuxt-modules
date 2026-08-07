import { computed, reactive, shallowRef, toRaw, watch } from "#imports";
import { attempt } from "module-utils/shared";

/** Options for a form that keeps a local editable draft. */
interface UseDraftFormOptions<TDraft extends object, TSubmission> {
  /** Returns the form-specific projection of the canonical source state. */
  getSource: () => TDraft;
  /** Persists a validated submission. */
  save: (submission: TSubmission) => Promise<void>;
  /** Runs when persisting the form fails. */
  onError: () => void;
}

/**
 * Creates a form draft that synchronizes only while it has no unsaved changes.
 *
 * @param options The source, persistence, and error-handling callbacks for the draft.
 * @returns The reactive draft state and controls for submitting it.
 */
export function useDraftForm<TDraft extends object, TSubmission>(
  options: UseDraftFormOptions<TDraft, TSubmission>
) {
  const state = reactive(copyDraft(options.getSource())) as TDraft;
  const initialState = shallowRef<TDraft>(copyDraft(state));
  const saving = shallowRef(false);

  const isDirty = computed(() => !isDraftEqual(state, initialState.value));

  watch(options.getSource, (source) => {
    if (!isDirty.value) replaceState(source);
  });

  /**
   * Persists a validated form submission and resets the draft from canonical source state.
   *
   * @param submission The validated form submission to persist.
   * @returns A promise that settles after persistence and draft reset handling complete.
   */
  async function submit(submission: TSubmission): Promise<void> {
    saving.value = true;

    const result = await attempt(async () => {
      await options.save(submission);
      replaceState(options.getSource());
    });
    if (result.error !== null) {
      options.onError();
    }
    saving.value = false;
  }

  /**
   * Replaces the local draft and its clean snapshot.
   *
   * @param nextState The canonical state to copy into the draft.
   * @returns Nothing.
   */
  function replaceState(nextState: TDraft): void {
    Object.assign(state, copyDraft(nextState));
    initialState.value = copyDraft(state);
  }

  return { state, saving, isDirty, submit };
}

/**
 * Copies a form draft so local edits never mutate the canonical source state.
 *
 * @param draft The draft to copy.
 * @returns A detached copy of the draft.
 */
function copyDraft<TDraft extends object>(draft: TDraft): TDraft {
  return structuredClone(toRawDeep(draft));
}

/**
 * Removes Vue proxies at every level so the browser's structured clone algorithm can copy a draft.
 *
 * @param value The value to unwrap recursively.
 * @returns The unwrapped value.
 */
function toRawDeep<T>(value: T): T {
  if (typeof value !== "object" || value === null) return value;

  const rawValue = toRaw(value);

  if (Array.isArray(rawValue)) {
    return rawValue.map((item) => toRawDeep(item)) as T;
  }

  if (rawValue instanceof Date) return rawValue as unknown as T;

  if (isPlainObject(rawValue)) {
    const copy: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(rawValue)) {
      copy[key] = toRawDeep(item);
    }

    return copy as T;
  }

  return rawValue;
}

/**
 * Compares plain form values without depending on object-key insertion order.
 *
 * @param left The first value to compare.
 * @param right The second value to compare.
 * @returns Whether both values contain the same plain form data.
 */
function isDraftEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (!isPlainObject(left) || !isPlainObject(right)) return false;

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;

  return leftKeys.every((key) => Object.hasOwn(right, key) && isDraftEqual(left[key], right[key]));
}

/**
 * Narrows unknown values to the plain object shapes accepted by Nuxt UI forms.
 *
 * @param value The value to test.
 * @returns Whether the value is a plain object.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
