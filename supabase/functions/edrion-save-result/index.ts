import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ code: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    // ── [1] Auth required ────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const token = authHeader?.replace("Bearer ", "") || "";

    if (!authHeader?.startsWith("Bearer ") || token === anonKey) {
      return json({ code: "AUTH_REQUIRED" }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      anonKey,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user?.id) {
      return json({ code: "AUTH_REQUIRED" }, 401);
    }
    const userId = user.id;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── [2] Parse body ───────────────────────────────────────
    const body = await req.json();
    const { handle, nicho, objetivo, result } = body as {
      handle?: string;
      nicho?: string;
      objetivo?: string;
      result?: unknown;
    };

    if (!handle || !nicho || !objetivo || !result) {
      return json({ code: "VALIDATION_ERROR", message: "Dados incompletos" }, 422);
    }

    const cleanHandle = handle.replace(/^@/, "").trim().toLowerCase();

    // ── [3] Check cache (handle + user_id) ───────────────────
    const { data: cached } = await supabaseAdmin
      .from("analysis_result")
      .select("id")
      .eq("handle", cleanHandle)
      .eq("user_id", userId)
      .limit(1);

    if (cached && cached.length > 0) {
      return json({ success: true, message: "Already saved" }, 200);
    }

    // ── [4] Check plan limits ────────────────────────────────
    let { data: userProfile } = await supabaseAdmin
      .from("users_profiles")
      .select("plan, free_analysis_used")
      .eq("id", userId)
      .single();

    if (!userProfile) {
      await supabaseAdmin.from("users_profiles").insert({
        id: userId,
        email: user.email || "",
        plan: "free",
        free_analysis_used: false,
      });
      userProfile = { plan: "free", free_analysis_used: false };
    }

    const plan = userProfile.plan || "free";
    if (plan === "free" && userProfile.free_analysis_used) {
      return json({ code: "FREE_LIMIT_REACHED" }, 403);
    }

    // ── [5] Persist ──────────────────────────────────────────
    const { data: reqInsert } = await supabaseAdmin
      .from("analysis_request")
      .insert({
        user_id: userId,
        handle: cleanHandle,
        nicho,
        objetivo,
        plan_at_time: plan,
      })
      .select("id")
      .single();

    if (reqInsert) {
      await supabaseAdmin.from("analysis_result").insert({
        request_id: reqInsert.id,
        handle: cleanHandle,
        result_json: result,
        user_id: userId,
      });
    }

    // ── [6] Mark free as used ────────────────────────────────
    if (plan === "free") {
      await supabaseAdmin
        .from("users_profiles")
        .update({ free_analysis_used: true })
        .eq("id", userId);
    }

    return json({ success: true }, 200);
  } catch (err) {
    console.error("edrion-save-result error:", err);
    return json({ code: "INTERNAL_ERROR", message: (err as Error).message }, 500);
  }
});
