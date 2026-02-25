import { useEffect, useCallback, useState } from "react";

declare const __APP_BUILD_TIME__: string;

export function useVersionCheck(intervalMs = 5 * 60 * 1000) {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const checkVersion = useCallback(async () => {
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.version && data.version !== __APP_BUILD_TIME__) {
        setUpdateAvailable(true);
      }
    } catch {
      // silently ignore network errors
    }
  }, []);

  useEffect(() => {
    const initial = setTimeout(checkVersion, 10_000);
    const interval = setInterval(checkVersion, intervalMs);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [checkVersion, intervalMs]);

  return { updateAvailable, refresh: () => window.location.reload() };
}
