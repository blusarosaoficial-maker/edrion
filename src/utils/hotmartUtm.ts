const UTM_STORAGE_KEY = "edrion_utms";

interface StoredUtms {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  all_params: string;
}

/**
 * Capture UTMs from the current URL and persist to sessionStorage.
 * Call this once on app init (e.g., in main.tsx or App.tsx).
 */
export function captureUtms(): void {
  try {
    const url = new URL(window.top?.location.href || window.location.href);
    const hasAny = url.searchParams.toString();
    if (!hasAny) return;

    const utms: StoredUtms = {
      utm_source: url.searchParams.get("utm_source") || "",
      utm_medium: url.searchParams.get("utm_medium") || "",
      utm_campaign: url.searchParams.get("utm_campaign") || "",
      utm_term: url.searchParams.get("utm_term") || "",
      utm_content: url.searchParams.get("utm_content") || "",
      all_params: url.searchParams.toString(),
    };

    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utms));
  } catch {
    // silent — private browsing may block sessionStorage
  }
}

function getStoredUtms(): StoredUtms | null {
  try {
    const raw = sessionStorage.getItem(UTM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Appends stored UTM params + sck to a Hotmart checkout URL.
 * Uses sessionStorage (persisted from initial landing) so UTMs
 * survive SPA navigation, login, and signup flows.
 */
export function appendUtmToCheckout(checkoutUrl: string): string {
  try {
    const stored = getStoredUtms();
    if (!stored || !stored.all_params) return checkoutUrl;

    const separator = checkoutUrl.includes("?") ? "&" : "?";
    let url = `${checkoutUrl}${separator}${stored.all_params}`;

    const hasUtms = stored.utm_source || stored.utm_medium || stored.utm_campaign || stored.utm_term || stored.utm_content;
    if (hasUtms) {
      url += `&sck=${stored.utm_source}|${stored.utm_medium}|${stored.utm_campaign}|${stored.utm_term}|${stored.utm_content}`;
    }

    return url;
  } catch {
    return checkoutUrl;
  }
}
