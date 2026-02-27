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
      .select("id, result_json")
      .eq("handle", cleanHandle)
      .eq("user_id", userId)
      .limit(1);

    if (cached && cached.length > 0) {
      // If cached result is missing weekly_content_plan but new result has it, update
      const cachedJson = cached[0].result_json as Record<string, unknown> | null;
      const cachedDeliverables = cachedJson?.deliverables as Record<string, unknown> | undefined;
      const newResult = result as Record<string, unknown>;
      const newDeliverables = newResult?.deliverables as Record<string, unknown> | undefined;

      if (!cachedDeliverables?.weekly_content_plan && newDeliverables?.weekly_content_plan) {
        // Update stale cache with new result that includes weekly_content_plan
        await supabaseAdmin
          .from("analysis_result")
          .update({ result_json: result })
          .eq("id", cached[0].id);
        return json({ success: true, message: "Updated with weekly content" }, 200);
      }

      return json({ success: true, message: "Already saved" }, 200);
    }

    // ── [4] Check plan limits ────────────────────────────────
    let { data: userProfile } = await supabaseAdmin
      .from("users_profiles")
      .select("plan, free_analysis_used, analysis_credits")
      .eq("id", userId)
      .single();

    if (!userProfile) {
      await supabaseAdmin.from("users_profiles").insert({
        id: userId,
        email: user.email || "",
        plan: "free",
        free_analysis_used: false,
        analysis_credits: 0,
      });
      userProfile = { plan: "free", free_analysis_used: false, analysis_credits: 0 };
    }

    const plan = userProfile.plan || "free";
    const credits = userProfile.analysis_credits || 0;
    let useCredit = false;

    if (plan === "free" && userProfile.free_analysis_used) {
      if (credits > 0) {
        // User has credits — allow and consume 1 credit
        useCredit = true;
      } else {
        return json({ code: "FREE_LIMIT_REACHED" }, 403);
      }
    }

    // ── [5] Persist ──────────────────────────────────────────
    // If using credit, the result is saved as premium (already unlocked)
    let resultToSave = result;
    if (useCredit) {
      const resultObj = result as Record<string, unknown>;
      resultToSave = { ...resultObj, plan: "premium" };
    }

    const { data: reqInsert } = await supabaseAdmin
      .from("analysis_request")
      .insert({
        user_id: userId,
        handle: cleanHandle,
        nicho,
        objetivo,
        plan_at_time: useCredit ? "credit" : plan,
      })
      .select("id")
      .single();

    if (reqInsert) {
      await supabaseAdmin.from("analysis_result").insert({
        request_id: reqInsert.id,
        handle: cleanHandle,
        result_json: resultToSave,
        user_id: userId,
        unlocked_at: useCredit ? new Date().toISOString() : null,
      });
    }

    // ── [6] Update user profile ────────────────────────────
    if (useCredit) {
      // Consume 1 credit
      await supabaseAdmin
        .from("users_profiles")
        .update({ analysis_credits: credits - 1 })
        .eq("id", userId);
    } else if (plan === "free") {
      // Mark free analysis as used
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
