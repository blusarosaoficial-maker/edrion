import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Seed showcase profile avatars into Supabase storage.
 * This function fetches profile pictures from Instagram via Apify
 * and caches them in the avatars bucket.
 *
 * Call manually when you need to refresh showcase avatars.
 * Requires service_role key.
 */

const SHOWCASE_HANDLES = [
  "biaborges",
  "thiago.nigro",
  "francinyehlke",
  "camilacoutinho",
  "mohindi",
  "nortonmello",
  "waborges",
  "manualdomundo",
  "eduardofeldberg",
  "virginia",
];

interface ApifyProfile {
  username?: string;
  fullName?: string;
  profilePicUrl?: string;
  profilePicUrlHD?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
  verified?: boolean;
  biography?: string;
  isPrivate?: boolean;
}

async function scrapeProfile(handle: string): Promise<ApifyProfile | null> {
  const token = Deno.env.get("APIFY_TOKEN");
  const actorId = Deno.env.get("APIFY_ACTOR_ID") || "apify~instagram-scraper";

  if (!token) throw new Error("APIFY_TOKEN not set");

  const runUrl = `https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`;
  const runRes = await fetch(runUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      directUrls: [`https://www.instagram.com/${handle}/`],
      resultsType: "details",
      resultsLimit: 1,
      searchType: "user",
      maxRequestRetries: 3,
    }),
  });

  if (!runRes.ok) {
    console.error(`Apify run failed for ${handle}:`, runRes.status);
    return null;
  }

  const run = await runRes.json();
  const datasetId = run?.data?.defaultDatasetId;
  if (!datasetId) return null;

  // Wait for run to complete
  const runId = run?.data?.id;
  const statusUrl = `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const statusRes = await fetch(statusUrl);
    const statusData = await statusRes.json();
    const status = statusData?.data?.status;
    if (status === "SUCCEEDED") break;
    if (status === "FAILED" || status === "ABORTED") return null;
  }

  const dataUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&format=json`;
  const dataRes = await fetch(dataUrl);
  const items = await dataRes.json();

  return items?.[0] || null;
}

async function proxyAvatar(
  handle: string,
  originalUrl: string,
  supabaseAdmin: ReturnType<typeof createClient>,
): Promise<string> {
  if (!originalUrl) return "";
  try {
    const res = await fetch(originalUrl);
    if (!res.ok) throw new Error(`fetch avatar ${res.status}`);
    const blob = await res.blob();
    const arrayBuf = await blob.arrayBuffer();
    const filePath = `${handle}.jpg`;

    await supabaseAdmin.storage.from("avatars").remove([filePath]);

    const { error: uploadErr } = await supabaseAdmin.storage
      .from("avatars")
      .upload(filePath, new Uint8Array(arrayBuf), {
        contentType: blob.type || "image/jpeg",
        upsert: true,
      });

    if (uploadErr) throw uploadErr;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    return `${supabaseUrl}/storage/v1/object/public/avatars/${filePath}`;
  } catch (err) {
    console.warn(`proxyAvatar failed for ${handle}:`, (err as Error).message);
    return originalUrl;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify service_role authorization
    const authHeader = req.headers.get("Authorization");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!authHeader?.includes(serviceKey || "___")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const handles: string[] = body.handles || SHOWCASE_HANDLES;

    const results: Record<string, { success: boolean; avatar_url?: string; error?: string; profile_data?: Record<string, unknown> }> = {};

    for (const handle of handles) {
      console.log(`Processing showcase profile: ${handle}`);
      try {
        const profile = await scrapeProfile(handle);
        if (!profile) {
          results[handle] = { success: false, error: "scrape failed" };
          continue;
        }

        const avatarUrl = profile.profilePicUrlHD || profile.profilePicUrl || "";
        const proxied = await proxyAvatar(handle, avatarUrl, supabaseAdmin);

        results[handle] = {
          success: true,
          avatar_url: proxied,
          profile_data: {
            full_name: profile.fullName,
            followers: profile.followersCount,
            following: profile.followsCount,
            posts_count: profile.postsCount,
            is_verified: profile.verified,
            bio: profile.biography,
          },
        };
      } catch (err) {
        results[handle] = { success: false, error: (err as Error).message };
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
