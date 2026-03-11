const HOTMART_PREFIXES = [
  "https://payment.hotmart.com",
  "https://pay.hotmart.com",
  "https://go.hotmart.com",
];

/**
 * Captures UTM params from the current page URL and appends them
 * (plus the Hotmart sck param) to a Hotmart checkout URL.
 */
export function appendUtmToCheckout(checkoutUrl: string): string {
  try {
    const pageUrl = new URL(window.top?.location.href || window.location.href);
    const params = new URLSearchParams();

    // Forward all query params from the landing page
    pageUrl.searchParams.forEach((value, key) => {
      params.set(key, value);
    });

    // Build sck (source tracking) from UTMs
    const utmSource = pageUrl.searchParams.get("utm_source") || "";
    const utmMedium = pageUrl.searchParams.get("utm_medium") || "";
    const utmCampaign = pageUrl.searchParams.get("utm_campaign") || "";
    const utmTerm = pageUrl.searchParams.get("utm_term") || "";
    const utmContent = pageUrl.searchParams.get("utm_content") || "";

    const hasUtms = utmSource || utmMedium || utmCampaign || utmTerm || utmContent;

    if (params.toString()) {
      const separator = checkoutUrl.includes("?") ? "&" : "?";
      let url = `${checkoutUrl}${separator}${params.toString()}`;
      if (hasUtms) {
        url += `&sck=${utmSource}|${utmMedium}|${utmCampaign}|${utmTerm}|${utmContent}`;
      }
      return url;
    }

    return checkoutUrl;
  } catch {
    return checkoutUrl;
  }
}
