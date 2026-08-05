import type { StorageLike } from "pinia-plugin-persistedstate";

/**
 * Creates the browser local-storage adapter used by persisted Pinia state.
 * @returns A persisted-state storage backed by `window.localStorage`.
 */
export function useLocalStorage(): StorageLike {
  return {
    getItem: (key) => (import.meta.client ? window.localStorage.getItem(key) : null),
    setItem: (key, value) => {
      if (import.meta.client) window.localStorage.setItem(key, value);
    }
  };
}
