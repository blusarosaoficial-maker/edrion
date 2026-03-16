import { supabase } from "@/integrations/supabase/client";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "EDR-";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function getOrCreateReferral(userId: string) {
  // Try to fetch existing
  const { data: existing } = await (supabase
    .from("referrals" as any)
    .select("*")
    .eq("user_id", userId)
    .single() as any);

  if (existing) return existing;

  // Create new
  const code = generateCode();
  const { data: created, error } = await supabase
    .from("referrals")
    .insert({ user_id: userId, referral_code: code })
    .select()
    .single();

  if (error) throw error;
  return created;
}

export async function processReferralOnSignup(referralCode: string, userId: string) {
  await supabase.rpc("process_referral_signup", {
    p_referral_code: referralCode,
    p_referred_user_id: userId,
  });
}

export function getReferralLink(code: string): string {
  return `${window.location.origin}?ref=${code}`;
}
