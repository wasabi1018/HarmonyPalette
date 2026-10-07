"use client";

import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createInstagramSessionStore } from "@/lib/instagram-admin-session";

const SessionContext = createContext<ReturnType<typeof createInstagramSessionStore> | null>(null);

export function InstagramSessionProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createInstagramSessionStore);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!store.hasUnsaved()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const confirmExit = (event: MouseEvent) => {
      if (!store.hasUnsaved() || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a") : null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin === window.location.origin && (url.pathname === "/admin" || url.pathname.startsWith("/admin/"))) return;
      if (!window.confirm("未保存の編集内容があります。管理画面を離れますか？")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", confirmExit, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", confirmExit, true);
    };
  }, [store]);
  return <SessionContext.Provider value={store}>{children}</SessionContext.Provider>;
}

export function useInstagramSessionState<T>(key: string, initial: T | (() => T)) {
  const shared = useContext(SessionContext);
  const [fallback] = useState(createInstagramSessionStore);
  const store = shared ?? fallback;
  const [initialValue] = useState(initial);
  const subscribe = useCallback((listener: () => void) => store.subscribe(key, listener), [key, store]);
  const getSnapshot = useCallback(() => store.read<T>(key, initialValue), [initialValue, key, store]);
  const getServerSnapshot = useCallback(() => initialValue, [initialValue]);
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setValue = useCallback((action: T | ((previous: T) => T)) => store.write(key, initialValue, action), [initialValue, key, store]);
  return [value, setValue] as const;
}

export function useInstagramUnsavedChanges(key: string, dirty: boolean) {
  const store = useContext(SessionContext);
  useEffect(() => { store?.markUnsaved(key, dirty); }, [dirty, key, store]);
}
