import { supabase } from "@/integrations/supabase/client";

/**
 * Track clicks on showcase profile cards.
 * Stores handle + niche so we can analyze which profiles
 * attract the most interest and find similar ones.
 */
export async function trackShowcaseClick(handle: string, niche: string) {
  try {
    await (supabase.from as any)("showcase_clicks").insert({
      handle,
      niche,
    });
  } catch {
    // Silent fail — tracking should never block UX
  }
}
