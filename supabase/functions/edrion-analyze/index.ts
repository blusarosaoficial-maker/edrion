import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HANDLE_REGEX = /^[a-zA-Z0-9._]{1,30}$/;

const NICHO_BIOS: Record<string, { suggested: string; rationale: string; cta: string }> = {
  fitness: {
    suggested: "Transformo corpos em 12 semanas com treino e dieta personalizados. +500 alunos. ⬇️ Comece agora",
    rationale: "Bio genérica sem proposta de valor clara nem prova social",
    cta: "Agende sua avaliação gratuita",
  },
  marketing: {
    suggested: "Ajudo negócios a faturar 6 dígitos com tráfego pago. Resultados em 30 dias ou devolvemos. ⬇️",
    rationale: "Falta especificidade no serviço e garantia para o cliente",
    cta: "Solicite seu diagnóstico gratuito",
  },
  gastronomia: {
    suggested: "Chef de cozinha com receitas práticas em até 15 min. +200 receitas testadas. ⬇️ Cardápio semanal grátis",
    rationale: "Bio não comunica expertise nem diferencial",
    cta: "Baixe o cardápio da semana",
  },
  moda: {
    suggested: "Consultora de imagem: vista-se com intenção e destaque-se sem gastar mais. ⬇️ Quiz de estilo grátis",
    rationale: "Bio em inglês perde conexão com público brasileiro",
    cta: "Descubra seu estilo em 2 minutos",
  },
  default: {
    suggested: "Especialista em [seu nicho] ajudando [público] a alcançar [resultado]. ⬇️ Entre em contato",
    rationale: "Bio vaga sem proposta de valor específica",
    cta: "Fale comigo no direct",
  },
};

const NEXT_POST_BY_NICHO: Record<string, { format: string; hook: string; outline: string[]; cta: string; angle: string }> = {
  fitness: {
    format: "reel",
    hook: "Você está fazendo esse exercício ERRADO e nem sabe",
    outline: ["Mostre o erro comum na execução", "Demonstre a forma correta", "Explique o impacto nos resultados"],
    cta: "Comente TREINO para receber a planilha gratuita",
    angle: "Conteúdo educativo com correção de erro comum",
  },
  marketing: {
    format: "carrossel",
    hook: "Gastei R$50 mil em ads pra aprender essas 5 lições",
    outline: ["Abra com resultado real", "Liste as 5 lições com dados", "Feche com ação prática"],
    cta: "Salve esse post e aplique na sua próxima campanha",
    angle: "Autoridade via experiência com dados concretos",
  },
  default: {
    format: "reel",
    hook: "Você está cometendo esse erro no seu conteúdo?",
    outline: ["Apresente o erro comum", "Mostre consequência", "Entregue solução prática"],
    cta: "Comente QUERO para receber o modelo",
    angle: "Conteúdo educativo com promessa de solução prática",
  },
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface ApifyPost {
  id?: string;
  shortCode?: string;
  url?: string;
  displayUrl?: string;
  caption?: string;
  likesCount?: number;
  commentsCount?: number;
  videoViewCount?: number;
}

interface ApifyProfile {
  username?: string;
  fullName?: string;
  profilePicUrl?: string;
  profilePicUrlHD?: string;
  biography?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
  verified?: boolean;
  latestPosts?: ApifyPost[];
  isPrivate?: boolean;
}

function normalizeProfile(raw: ApifyProfile) {
  return {
    handle: raw.username || "",
    full_name: raw.fullName || raw.username || "",
    avatar_url: raw.profilePicUrlHD || raw.profilePicUrl || "",
    bio_text: raw.biography || "",
    followers: raw.followersCount || 0,
    following: raw.followsCount || 0,
    posts_count: raw.postsCount || 0,
    is_verified: raw.verified || false,
  };
}

async function proxyAvatar(
  handle: string,
  originalUrl: string,
  supabaseAdmin: ReturnType<typeof createClient>,
): Promise<string> {
  if (!originalUrl) return originalUrl;
  try {
    const res = await fetch(originalUrl);
    if (!res.ok) throw new Error(`fetch avatar ${res.status}`);
    const blob = await res.blob();
    const arrayBuf = await blob.arrayBuffer();
    const filePath = `${handle}.jpg`;

    // Upsert: remove old file first (ignore error if not exists)
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
    console.warn("proxyAvatar fallback to original:", (err as Error).message);
    return originalUrl;
  }
}

function normalizePosts(posts: ApifyPost[]) {
  return posts.slice(0, 9).map((p, i) => {
    const likes = p.likesCount || 0;
    const comments = p.commentsCount || 0;
    const views = p.videoViewCount || 0;
    const engagement_score = views > 0
      ? parseFloat(((likes + 2 * comments) / views).toFixed(4))
      : likes + 2 * comments;

    return {
      post_id: p.id || p.shortCode || `post_${i}`,
      permalink: p.url || (p.shortCode ? `https://instagram.com/p/${p.shortCode}` : ""),
      thumb_url: p.displayUrl || "",
      caption_preview: (p.caption || "").slice(0, 120),
      metrics: { likes, comments, views, engagement_score },
    };
  });
}

async function callApify(handle: string): Promise<ApifyProfile> {
  const token = Deno.env.get("APIFY_TOKEN");
  const actorId = Deno.env.get("APIFY_ACTOR_ID") || "apify~instagram-scraper";

  // Step 1: Start the actor run (async, returns immediately)
  const startUrl = `https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`;
  const startRes = await fetch(startUrl, {
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

  if (!startRes.ok) {
    const text = await startRes.text();
    throw new Error(`Apify start failed ${startRes.status}: ${text}`);
  }

  const runInfo = await startRes.json();
  const runId = runInfo?.data?.id;
  const datasetId = runInfo?.data?.defaultDatasetId;

  if (!runId || !datasetId) {
    throw new Error("Apify run failed to start");
  }

  // Step 2: Poll for run completion (max ~50s to stay within edge function limits)
  const maxWait = 50000;
  const pollInterval = 3000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    await new Promise((r) => setTimeout(r, pollInterval));

    const statusRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`,
    );
    if (!statusRes.ok) {
      await statusRes.text();
      continue;
    }

    const statusData = await statusRes.json();
    const status = statusData?.data?.status;

    if (status === "SUCCEEDED") {
      // Step 3: Fetch dataset items
      const dataRes = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&format=json`,
      );
      if (!dataRes.ok) {
        const text = await dataRes.text();
        throw new Error(`Apify dataset fetch failed: ${text}`);
      }

      const data = await dataRes.json();

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("NOT_FOUND");
      }

      const profile = data[0] as ApifyProfile;

      if (profile.isPrivate) {
        throw new Error("PRIVATE_PROFILE");
      }

      return profile;
    }

    if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
      throw new Error("NOT_FOUND");
    }
    // else RUNNING/READY — keep polling
  }

  throw new Error("TIMEOUT");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ code: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    const body = await req.json();
    const { handle, nicho, objetivo } = body as { handle?: string; nicho?: string; objetivo?: string };

    // 1. Validate
    const cleanHandle = (handle || "").replace(/^@/, "").trim().toLowerCase();
    if (!cleanHandle || !HANDLE_REGEX.test(cleanHandle)) {
      return json({ code: "VALIDATION_ERROR", message: "Handle inválido" }, 422);
    }
    if (!nicho || !objetivo) {
      return json({ code: "VALIDATION_ERROR", message: "Nicho e objetivo são obrigatórios" }, 422);
    }

    // Create service role client for DB operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 2. Check if handle already analyzed
    const { data: existingResults } = await supabaseAdmin
      .from("analysis_result")
      .select("id, request_id, result_json, analysis_request!inner(user_id)")
      .eq("handle", cleanHandle)
      .limit(1);

    const existingResult = existingResults?.[0];

    // 3. Check auth
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user }, error: userError } = await userClient.auth.getUser();
      if (!userError && user?.id) {
        userId = user.id;
      }
    }

    // If handle exists in DB
    if (existingResult) {
      const ownerUserId = (existingResult as any).analysis_request?.user_id;
      if (userId && ownerUserId === userId) {
        // Return cached result
        return json({ success: true, data: existingResult.result_json }, 200);
      }
      // Belongs to another user or no auth
      return json({ code: "HANDLE_ALREADY_ANALYZED" }, 409);
    }

    // 4. If not authenticated -> scrape but require email
    if (!userId) {
      // Run scraping anyway
      let rawProfile: ApifyProfile;
      try {
        rawProfile = await callApify(cleanHandle);
      } catch (err) {
        const msg = (err as Error).message;
        if (msg === "PRIVATE_PROFILE") return json({ code: "PRIVATE_PROFILE" }, 403);
        if (msg === "NOT_FOUND") return json({ code: "NOT_FOUND" }, 404);
        return json({ code: "TIMEOUT" }, 504);
      }

      const profile = normalizeProfile(rawProfile);
      profile.avatar_url = await proxyAvatar(cleanHandle, profile.avatar_url, supabaseAdmin);
      const posts = normalizePosts(rawProfile.latestPosts || []);
      const nichoKey = Object.keys(NICHO_BIOS).includes(nicho) ? nicho : "default";
      const result = buildFreeResult(profile, posts, nichoKey);

      return json({ code: "EMAIL_REQUIRED", pending_result: result }, 401);
    }

    // 5. Check plan limits
    const { data: userProfile } = await supabaseAdmin
      .from("users_profiles")
      .select("plan, free_analysis_used")
      .eq("id", userId)
      .single();

    if (!userProfile) {
      // Auto-create profile if missing
      await supabaseAdmin.from("users_profiles").insert({
        id: userId,
        email: "",
        plan: "free",
        free_analysis_used: false,
      });
    }

    const plan = userProfile?.plan || "free";
    const freeUsed = userProfile?.free_analysis_used || false;

    if (plan === "free" && freeUsed) {
      return json({ code: "FREE_LIMIT_REACHED" }, 403);
    }

    // 6. Call Apify
    let rawProfile: ApifyProfile;
    try {
      rawProfile = await callApify(cleanHandle);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === "PRIVATE_PROFILE") return json({ code: "PRIVATE_PROFILE" }, 403);
      if (msg === "NOT_FOUND") return json({ code: "NOT_FOUND" }, 404);
      return json({ code: "TIMEOUT" }, 504);
    }

    // 7. Normalize
    const profile = normalizeProfile(rawProfile);
    profile.avatar_url = await proxyAvatar(cleanHandle, profile.avatar_url, supabaseAdmin);
    const posts = normalizePosts(rawProfile.latestPosts || []);
    const nichoKey = Object.keys(NICHO_BIOS).includes(nicho) ? nicho : "default";

    // 8. Build result
    const result = plan === "premium"
      ? buildPremiumResult(profile, posts, nichoKey)
      : buildFreeResult(profile, posts, nichoKey);

    // 9. Persist
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
        is_reanalysis: false,
      });
    }

    // 10. Update free_analysis_used
    if (plan === "free") {
      await supabaseAdmin
        .from("users_profiles")
        .update({ free_analysis_used: true })
        .eq("id", userId);
    }

    return json({ success: true, data: result }, 200);
  } catch (err) {
    console.error("edrion-analyze error:", err);
    return json({ code: "INTERNAL_ERROR", message: (err as Error).message }, 500);
  }
});

function buildFreeResult(
  profile: ReturnType<typeof normalizeProfile>,
  posts: ReturnType<typeof normalizePosts>,
  nichoKey: string,
) {
  const bio = NICHO_BIOS[nichoKey] || NICHO_BIOS["default"];

  let topIdx = 0;
  let worstIdx = 0;
  for (let i = 1; i < posts.length; i++) {
    if (posts[i].metrics.engagement_score > posts[topIdx].metrics.engagement_score) topIdx = i;
    if (posts[i].metrics.engagement_score < posts[worstIdx].metrics.engagement_score) worstIdx = i;
  }

  return {
    profile,
    deliverables: {
      bio_suggestion: {
        current_bio: profile.bio_text,
        suggested_bio: bio.suggested,
        rationale_short: bio.rationale,
        cta_option: bio.cta,
      },
      top_post: posts[topIdx] || null,
      worst_post: posts[worstIdx] || null,
      next_post_suggestion: NEXT_POST_BY_NICHO[nichoKey] || NEXT_POST_BY_NICHO["default"],
    },
    limits: { posts_analyzed: posts.length, note: "Diagnóstico objetivo" },
    plan: "free" as const,
  };
}

function buildPremiumResult(
  profile: ReturnType<typeof normalizeProfile>,
  posts: ReturnType<typeof normalizePosts>,
  nichoKey: string,
) {
  const freeResult = buildFreeResult(profile, posts, nichoKey);

  return {
    ...freeResult,
    deliverables: {
      ...freeResult.deliverables,
      bio_variations: [],
      posts_analysis: posts,
      competitors_analysis: [],
      strategic_score: null,
      improvement_plan: null,
      pdf_available: true,
    },
    reanalysis_available: true,
    plan: "premium" as const,
  };
}
