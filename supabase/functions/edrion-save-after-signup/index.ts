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
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ code: "UNAUTHORIZED" }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user?.id) {
      return json({ code: "UNAUTHORIZED" }, 401);
    }

    const userId = user.id;

    const body = await req.json();
    const { handle, nicho, objetivo, pending_result } = body;

    if (!handle || !nicho || !objetivo || !pending_result) {
      return json({ code: "VALIDATION_ERROR", message: "Campos obrigatórios faltando" }, 422);
    }

    const cleanHandle = handle.replace(/^@/, "").trim().toLowerCase();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Check handle not already taken
    const { data: existing } = await supabaseAdmin
      .from("analysis_result")
      .select("id")
      .eq("handle", cleanHandle)
      .limit(1);

    if (existing && existing.length > 0) {
      return json({ code: "HANDLE_ALREADY_ANALYZED" }, 409);
    }

    // Insert request
    const { data: reqInsert, error: reqError } = await supabaseAdmin
      .from("analysis_request")
      .insert({
        user_id: userId,
        handle: cleanHandle,
        nicho,
        objetivo,
        plan_at_time: "free",
      })
      .select("id")
      .single();

    if (reqError || !reqInsert) {
      console.error("Insert request error:", reqError);
      return json({ code: "INTERNAL_ERROR" }, 500);
    }

    // Insert result
    const { error: resError } = await supabaseAdmin
      .from("analysis_result")
      .insert({
        request_id: reqInsert.id,
        handle: cleanHandle,
        result_json: pending_result,
        is_reanalysis: false,
      });

    if (resError) {
      console.error("Insert result error:", resError);
      return json({ code: "INTERNAL_ERROR" }, 500);
    }

    // Mark free analysis used
    await supabaseAdmin
      .from("users_profiles")
      .update({ free_analysis_used: true })
      .eq("id", userId);

    return json({ success: true }, 200);
  } catch (err) {
    console.error("edrion-save-after-signup error:", err);
    return json({ code: "INTERNAL_ERROR", message: (err as Error).message }, 500);
  }
});
