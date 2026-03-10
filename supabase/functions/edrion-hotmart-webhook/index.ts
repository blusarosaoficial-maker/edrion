import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-hotmart-hottok",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── PURCHASE_APPROVED handler ──────────────────────────────────

// deno-lint-ignore no-explicit-any
async function handlePurchaseApproved(
  supabaseAdmin: any,
  buyerEmail: string,
  webhookEventId: string,
) {
  const email = buyerEmail.toLowerCase().trim();

  // 1. Find user by email in auth.users
  const { data: usersData, error: listError } =
    await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });

  if (listError) {
    console.error("Error listing users:", listError);
    await markTransactionError(supabaseAdmin, webhookEventId, `listUsers error: ${listError.message}`);
    return;
  }

  // deno-lint-ignore no-explicit-any
  const matchedUser = usersData?.users?.find(
    (u: any) => u.email?.toLowerCase().trim() === email,
  );

  if (!matchedUser) {
    console.warn(`No user found for email: ${email}`);
    await markTransactionError(supabaseAdmin, webhookEventId, `No user found for email: ${email}`);
    return;
  }

  const userId = matchedUser.id;

  // Link user_id to transaction
  await supabaseAdmin
    .from("hotmart_transactions")
    .update({ user_id: userId })
    .eq("webhook_event_id", webhookEventId);

  // 2. Find most recent locked analysis for this user
  const { data: lockedResults } = await supabaseAdmin
    .from("analysis_result")
    .select("id, result_json")
    .eq("user_id", userId)
    .is("unlocked_at", null)
    .order("created_at", { ascending: false })
    .limit(10);

  // Filter for plan:"free" in result_json
  // deno-lint-ignore no-explicit-any
  const lockedAnalysis = lockedResults?.find((r: any) => {
    const resultJson = r.result_json as Record<string, unknown> | null;
    return resultJson?.plan === "free";
  });

  if (lockedAnalysis) {
    // 3a. Unlock the analysis — change plan from "free" to "premium"
    const updatedJson = {
      ...(lockedAnalysis.result_json as Record<string, unknown>),
      plan: "premium",
    };

    await supabaseAdmin
      .from("analysis_result")
      .update({
        result_json: updatedJson,
        unlocked_at: new Date().toISOString(),
      })
      .eq("id", lockedAnalysis.id);

    // Link analysis to transaction
    await supabaseAdmin
      .from("hotmart_transactions")
      .update({ analysis_result_id: lockedAnalysis.id })
      .eq("webhook_event_id", webhookEventId);

    console.log(`Unlocked analysis ${lockedAnalysis.id} for user ${userId}`);
  } else {
    // 3b. No locked analysis — add credit
    await supabaseAdmin.rpc("increment_analysis_credits", { p_user_id: userId });
    console.log(`Added 1 credit for user ${userId} (no locked analysis found)`);
  }

  // 4. Reset free_analysis_used so user can do another free analysis
  await supabaseAdmin
    .from("users_profiles")
    .update({ free_analysis_used: false })
    .eq("id", userId);

  // 5. Mark transaction as processed
  await supabaseAdmin
    .from("hotmart_transactions")
    .update({ processed: true, processed_at: new Date().toISOString() })
    .eq("webhook_event_id", webhookEventId);
}

// ── PURCHASE_REFUNDED handler ──────────────────────────────────

// deno-lint-ignore no-explicit-any
async function handlePurchaseRefunded(
  supabaseAdmin: any,
  transactionCode: string,
  buyerEmail: string,
  webhookEventId: string,
) {
  // Find the original PURCHASE_APPROVED transaction
  const { data: originalTx } = await supabaseAdmin
    .from("hotmart_transactions")
    .select("id, analysis_result_id, user_id")
    .eq("transaction_code", transactionCode)
    .eq("event_type", "PURCHASE_APPROVED")
    .eq("processed", true)
    .limit(1)
    .single();

  if (originalTx?.analysis_result_id) {
    // Re-lock the analysis
    const { data: result } = await supabaseAdmin
      .from("analysis_result")
      .select("result_json")
      .eq("id", originalTx.analysis_result_id)
      .single();

    if (result) {
      const updatedJson = {
        ...(result.result_json as Record<string, unknown>),
        plan: "free",
      };

      await supabaseAdmin
        .from("analysis_result")
        .update({
          result_json: updatedJson,
          unlocked_at: null,
        })
        .eq("id", originalTx.analysis_result_id);

      console.log(`Re-locked analysis ${originalTx.analysis_result_id} due to refund`);
    }
  }

  // Auto-block the email on refund
  const email = buyerEmail.toLowerCase().trim();
  if (email && email !== "unknown") {
    await supabaseAdmin
      .from("blocked_users")
      .upsert(
        {
          email,
          user_id: originalTx?.user_id || null,
          reason: "refund",
          notes: `Auto-blocked: refund on transaction ${transactionCode}`,
        },
        { onConflict: "email" },
      );

    // Ban user in Supabase Auth (if user exists)
    if (originalTx?.user_id) {
      await supabaseAdmin.auth.admin.updateUserById(originalTx.user_id, {
        ban_duration: "876000h",
      });
      console.log(`Banned user ${originalTx.user_id} due to refund`);
    }

    console.log(`Blocked email ${email} due to refund`);
  }

  // Link user_id and mark processed
  await supabaseAdmin
    .from("hotmart_transactions")
    .update({
      user_id: originalTx?.user_id || null,
      processed: true,
      processed_at: new Date().toISOString(),
    })
    .eq("webhook_event_id", webhookEventId);
}

// ── Helper: mark transaction error ─────────────────────────────

async function markTransactionError(
  supabaseAdmin: ReturnType<typeof createClient>,
  webhookEventId: string,
  errorMessage: string,
) {
  await supabaseAdmin
    .from("hotmart_transactions")
    .update({
      processed: true,
      processed_at: new Date().toISOString(),
      error_message: errorMessage,
    })
    .eq("webhook_event_id", webhookEventId);
}

// ── Main handler ───────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ code: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    const body = await req.json();

    console.log("Webhook received — event:", body.event, "id:", body.id);

    // 1. Validate hottok (can come in body or header)
    const expectedHottok = Deno.env.get("HOTMART_HOTTOK");
    if (expectedHottok) {
      const receivedHottok =
        body.hottok ||
        req.headers.get("x-hotmart-hottok") ||
        req.headers.get("X-Hotmart-Hottok");
      if (receivedHottok !== expectedHottok) {
        console.warn("Invalid hottok received:", receivedHottok);
        return json({ code: "UNAUTHORIZED" }, 401);
      }
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 2. Extract webhook data
    const webhookEventId = body.id || crypto.randomUUID();
    const eventType = body.event;
    const purchase = body.data?.purchase;
    const buyer = body.data?.buyer;

    if (!eventType) {
      console.error("Missing event type in webhook body:", JSON.stringify(body).slice(0, 500));
      return json({ code: "VALIDATION_ERROR", message: "Missing event" }, 422);
    }

    // Extract buyer email — Hotmart may send in different locations
    const buyerEmail = (
      buyer?.email ||
      buyer?.checkout_phone ||
      body.data?.email ||
      "unknown"
    ).toString().toLowerCase().trim();

    // Extract transaction code — may be in different paths
    const transactionCode = (
      purchase?.transaction ||
      purchase?.order_date ||
      body.data?.purchase?.transaction ||
      "unknown"
    ).toString();

    console.log("Parsed — event:", eventType, "buyer:", buyerEmail, "tx:", transactionCode);

    // 3. Idempotency — insert transaction, conflict = already processed
    const { error: insertError } = await supabaseAdmin
      .from("hotmart_transactions")
      .insert({
        webhook_event_id: webhookEventId,
        event_type: eventType,
        transaction_code: transactionCode,
        buyer_email: buyerEmail,
        buyer_name: buyer?.name || buyer?.first_name || null,
        product_id: body.data?.product?.id ? Number(body.data.product.id) : null,
        product_name: body.data?.product?.name || null,
        offer_code: purchase?.offer?.code || body.data?.offer?.code || null,
        price_value: purchase?.price?.value || purchase?.original_offer_price?.value || null,
        price_currency: purchase?.price?.currency_value || purchase?.original_offer_price?.currency_code || "BRL",
        payment_type: purchase?.payment?.type || null,
        raw_payload: body,
      });

    if (insertError) {
      // Unique constraint violation = already processed
      if (insertError.code === "23505") {
        console.log(`Webhook ${webhookEventId} already processed (idempotent)`);
        return json({ success: true, message: "Already processed" }, 200);
      }
      console.error("Insert error:", insertError);
      return json({ code: "DB_ERROR" }, 500);
    }

    // 4. Process based on event type
    console.log(`Processing webhook: ${eventType} (${webhookEventId})`);

    if (eventType === "PURCHASE_APPROVED" || eventType === "PURCHASE_COMPLETE") {
      await handlePurchaseApproved(
        supabaseAdmin,
        buyerEmail,
        webhookEventId,
      );
    } else if (eventType === "PURCHASE_REFUNDED") {
      await handlePurchaseRefunded(
        supabaseAdmin,
        transactionCode,
        buyerEmail,
        webhookEventId,
      );
    } else {
      // Other events (PURCHASE_CANCELED, etc.) — just store, mark processed
      await supabaseAdmin
        .from("hotmart_transactions")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("webhook_event_id", webhookEventId);
    }

    return json({ success: true }, 200);
  } catch (err) {
    console.error("edrion-hotmart-webhook error:", err);
    return json({ code: "INTERNAL_ERROR", message: (err as Error).message }, 500);
  }
});
