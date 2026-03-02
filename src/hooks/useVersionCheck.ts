import { useEffect, useCallback, useState } from "react";

declare const __APP_BUILD_TIME__: string;

async function clearBrowserCaches() {
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // Cache API nao disponivel — ignorar
  }
}

export function useVersionCheck(intervalMs = 5 * 60 * 1000) {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const checkVersion = useCallback(async () => {
    if (import.meta.env.DEV) return; // No version check in dev/preview
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.version && data.version !== __APP_BUILD_TIME__) {
        await clearBrowserCaches();
        if (document.hidden) {
          // Aba em background — reload transparente
          window.location.reload();
          return;
        }
        setUpdateAvailable(true);
      }
    } catch {
      // silently ignore network errors
    }
  }, []);

  useEffect(() => {
    const initial = setTimeout(checkVersion, 10_000);
    const interval = setInterval(checkVersion, intervalMs);

    // Verificar tambem quando aba volta ao foco
    const onFocus = () => checkVersion();
    window.addEventListener("focus", onFocus);

    return () => {
      clearTimeout(initial);
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [checkVersion, intervalMs]);

  return { updateAvailable, refresh: () => window.location.reload() };
}
