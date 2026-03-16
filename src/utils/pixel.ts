/**
 * Meta Pixel event helpers.
 * Pixel is loaded in index.html; these fire custom events from React.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function fire(event: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", event, params);
  }
}

/** User completed signup */
export function trackCompleteRegistration() {
  fire("CompleteRegistration");
}

/** User clicked "Desbloquear" → going to Hotmart checkout */
export function trackInitiateCheckout(value?: number, currency = "BRL") {
  fire("InitiateCheckout", {
    value: value ?? 57.00,
    currency,
  });
}

/** Purchase confirmed (called when webhook unlocks analysis) */
export function trackPurchase(value?: number, currency = "BRL") {
  fire("Purchase", {
    value: value ?? 57.00,
    currency,
  });
}

/** User viewed analysis result */
export function trackViewContent(handle?: string) {
  fire("ViewContent", handle ? { content_name: handle } : undefined);
}

/** User started a free analysis */
export function trackLead() {
  fire("Lead");
}
