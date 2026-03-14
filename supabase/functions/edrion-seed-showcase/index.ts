import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Seed showcase profile images into Supabase Storage.
 *
 * For each of the 10 showcase profiles this function:
 *  1. Calls Apify to scrape the Instagram profile + latest 9 posts
 *  2. Uploads the HD profile picture to the `avatars` bucket
 *  3. Identifies top-engagement and worst-engagement posts
 *  4. Uploads those two thumbnails to the `post-thumbnails` bucket
 *
 * Returns the Supabase Storage URLs so they can be hardcoded in the
 * showcase data files (no DB insertion needed — the existing
 * buildShowcaseResult() is used, it just needs real image URLs).
 *
 * Call with POST + service_role key in Authorization header.
 * Optional body: { "handles": ["bianca", "thiago.nigro"] } to seed a subset.
 */

const SHOWCASE_HANDLES = [
  "bianca",
  "thiago.nigro",
  "francinyehlke",
  "camilacoutinho",
  "mohindi",
  "nortonmello",
  "whinderssonnunes",
  "manualdomundo",
  "eduardofeldberg",
  "virginia",
];

interface ApifyPost {
  id?: string;
  shortCode?: string;
  displayUrl?: string;
  caption?: string;
  likesCount?: number;
  commentsCount?: number;
  videoViewCount?: number;
  type?: string;
  timestamp?: string;
}

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
  latestPosts?: ApifyPost[];
}

// ── Apify scraper ────────────────────────────────────────────

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
      resultsLimit: 9,
      searchType: "user",
      searchLimit: 1,
    }),
  });

  if (!runRes.ok) {
    console.error(`Apify run failed for ${handle}:`, runRes.status);
    return null;
  }

  const run = await runRes.json();
  const runId = run?.data?.id;
  const datasetId = run?.data?.defaultDatasetId;
  if (!runId || !datasetId) return null;

  // Poll for completion (max 90s for showcase — profiles with lots of posts may be slower)
  const statusUrl = `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const statusRes = await fetch(statusUrl);
    const statusData = await statusRes.json();
    const status = statusData?.data?.status;
    if (status === "SUCCEEDED") break;
    if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
      console.error(`Apify run ${status} for ${handle}`);
      return null;
    }
  }

  const dataUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&format=json`;
  const dataRes = await fetch(dataUrl);
  const items = await dataRes.json();

  return items?.[0] || null;
}

// ── Image upload helpers ─────────────────────────────────────

async function uploadImage(
  bucket: string,
  filePath: string,
  imageUrl: string,
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
): Promise<string> {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`fetch failed ${res.status} for ${imageUrl}`);
  const blob = await res.blob();
  const arrayBuf = await blob.arrayBuffer();

  // Remove existing file first (idempotent)
  await supabaseAdmin.storage.from(bucket).remove([filePath]);

  const { error: uploadErr } = await supabaseAdmin.storage
    .from(bucket)
    .upload(filePath, new Uint8Array(arrayBuf), {
      contentType: blob.type || "image/jpeg",
      upsert: true,
    });

  if (uploadErr) throw uploadErr;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
}

// ── Find top and worst posts by engagement ───────────────────

function findTopAndWorstPosts(
  posts: ApifyPost[],
  followers: number,
): { top: ApifyPost | null; worst: ApifyPost | null } {
  if (!posts || posts.length === 0) return { top: null, worst: null };

  const withEngagement = posts.map((p) => {
    const likes = p.likesCount || 0;
    const comments = p.commentsCount || 0;
    const views = p.videoViewCount || 0;
    const total = likes + comments;
    const engagement = followers > 0 ? total / followers : 0;
    return { post: p, engagement, views };
  });

  withEngagement.sort((a, b) => b.engagement - a.engagement);

  return {
    top: withEngagement[0]?.post || null,
    worst: withEngagement[withEngagement.length - 1]?.post || null,
  };
}

// ── Main handler ─────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify service_role authorization
    const authHeader = req.headers.get("Authorization") || "";
    const apikeyHeader = req.headers.get("apikey") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const isAuthorized = serviceKey && (authHeader.includes(serviceKey) || apikeyHeader === serviceKey);
    console.log("DEBUG auth:", { authFirst20: authHeader.substring(0, 27), serviceKeyFirst20: serviceKey.substring(0, 20), apikeyFirst20: apikeyHeader.substring(0, 20) });
    if (!isAuthorized) {
      console.error("Auth failed. authHeader present:", !!authHeader, "apikey present:", !!apikeyHeader, "serviceKey present:", !!serviceKey);
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

    const results: Record<
      string,
      {
        success: boolean;
        avatar_url?: string;
        top_post?: { post_id: string; thumb_url: string; permalink: string };
        worst_post?: { post_id: string; thumb_url: string; permalink: string };
        error?: string;
        profile_data?: Record<string, unknown>;
      }
    > = {};

    // Process profiles sequentially to avoid Apify rate limits
    for (const handle of handles) {
      console.log(`\n=== Processing showcase profile: @${handle} ===`);
      try {
        const profile = await scrapeProfile(handle);
        if (!profile) {
          results[handle] = { success: false, error: "scrape failed" };
          continue;
        }

        console.log(
          `  Scraped: ${profile.fullName}, ${profile.followersCount} followers, ${profile.latestPosts?.length || 0} posts`,
        );

        // 1. Upload avatar
        const avatarOriginal = profile.profilePicUrlHD || profile.profilePicUrl || "";
        let avatarUrl = "";
        if (avatarOriginal) {
          try {
            avatarUrl = await uploadImage("avatars", `${handle}.jpg`, avatarOriginal, supabaseAdmin);
            console.log(`  Avatar uploaded: ${avatarUrl}`);
          } catch (err) {
            console.warn(`  Avatar upload failed:`, (err as Error).message);
            avatarUrl = avatarOriginal;
          }
        }

        // 2. Find top and worst posts
        const { top, worst } = findTopAndWorstPosts(
          profile.latestPosts || [],
          profile.followersCount || 0,
        );

        let topPostResult: { post_id: string; thumb_url: string; permalink: string } | undefined;
        let worstPostResult: { post_id: string; thumb_url: string; permalink: string } | undefined;

        // 3. Upload top post thumbnail
        if (top?.displayUrl && top?.shortCode) {
          try {
            const thumbUrl = await uploadImage(
              "post-thumbnails",
              `${handle}/${handle}_top.jpg`,
              top.displayUrl,
              supabaseAdmin,
            );
            topPostResult = {
              post_id: `${handle}_top`,
              thumb_url: thumbUrl,
              permalink: `https://www.instagram.com/p/${top.shortCode}/`,
            };
            console.log(`  Top post thumbnail uploaded: ${thumbUrl}`);
          } catch (err) {
            console.warn(`  Top post thumbnail failed:`, (err as Error).message);
          }
        }

        // 4. Upload worst post thumbnail
        if (worst?.displayUrl && worst?.shortCode) {
          try {
            const thumbUrl = await uploadImage(
              "post-thumbnails",
              `${handle}/${handle}_worst.jpg`,
              worst.displayUrl,
              supabaseAdmin,
            );
            worstPostResult = {
              post_id: `${handle}_worst`,
              thumb_url: thumbUrl,
              permalink: `https://www.instagram.com/p/${worst.shortCode}/`,
            };
            console.log(`  Worst post thumbnail uploaded: ${thumbUrl}`);
          } catch (err) {
            console.warn(`  Worst post thumbnail failed:`, (err as Error).message);
          }
        }

        results[handle] = {
          success: true,
          avatar_url: avatarUrl,
          top_post: topPostResult,
          worst_post: worstPostResult,
          profile_data: {
            full_name: profile.fullName,
            followers: profile.followersCount,
            following: profile.followsCount,
            posts_count: profile.postsCount,
            is_verified: profile.verified,
            bio: profile.biography,
          },
        };

        console.log(`  ✓ @${handle} done`);
      } catch (err) {
        console.error(`  ✗ @${handle} error:`, (err as Error).message);
        results[handle] = { success: false, error: (err as Error).message };
      }
    }

    // Summary
    const successful = Object.values(results).filter((r) => r.success).length;
    console.log(`\n=== Seed complete: ${successful}/${handles.length} profiles ===`);

    return new Response(
      JSON.stringify({ success: true, processed: handles.length, successful, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Seed showcase error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
