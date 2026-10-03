export function createInstagramSessionStore() {
  const values = new Map<string, unknown>();
  const listeners = new Map<string, Set<() => void>>();
  const unsaved = new Set<string>();
  return {
    read<T>(key: string, initial: T): T {
      if (!values.has(key)) values.set(key, initial);
      return values.get(key) as T;
    },
    write<T>(key: string, initial: T, action: T | ((previous: T) => T)) {
      const previous = this.read(key, initial);
      const next = typeof action === "function" ? (action as (value: T) => T)(previous) : action;
      if (Object.is(previous, next)) return;
      values.set(key, next);
      listeners.get(key)?.forEach((listener) => listener());
    },
    subscribe(key: string, listener: () => void) {
      const subscriptions = listeners.get(key) ?? new Set<() => void>();
      subscriptions.add(listener);
      listeners.set(key, subscriptions);
      return () => { subscriptions.delete(listener); };
    },
    markUnsaved(key: string, dirty: boolean) {
      if (dirty) unsaved.add(key);
      else unsaved.delete(key);
    },
    hasUnsaved() { return unsaved.size > 0; },
  };
}

export type PreparedInstagramDmAsset = {
  month: string;
  characterName: string;
  keywords: string;
  dmText: string;
  file: File;
};
