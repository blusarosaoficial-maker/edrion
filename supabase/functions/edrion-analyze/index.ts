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

// ── Apify types ──────────────────────────────────────────────

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

// ── Data helpers ─────────────────────────────────────────────

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

// ── Apify scraper ────────────────────────────────────────────

async function callApify(handle: string): Promise<ApifyProfile> {
  const token = Deno.env.get("APIFY_TOKEN");
  const actorId = Deno.env.get("APIFY_ACTOR_ID") || "apify~instagram-scraper";

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
  }

  throw new Error("TIMEOUT");
}

// ── OpenAI bio analysis ──────────────────────────────────────

interface AIBioResult {
  profession_name: string;
  service: string;
  authority: string;
  call_to_action: string;
  score: number;
  strengths: string;
  improvements: string;
  suggested_bio: string;
  rationale: string;
  cta_option: string;
}

async function analyzeBioWithAI(
  profile: ReturnType<typeof normalizeProfile>,
  nicho: string,
  objetivo: string,
): Promise<AIBioResult | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    console.warn("OPENAI_API_KEY not set, falling back to template");
    return null;
  }

  const systemPrompt = `Você é uma especialista em Social Selling, posicionamento estratégico e otimização de perfis profissionais no Instagram.

Sua missão é analisar bios de perfis profissionais considerando o nicho e o objetivo do perfil, tornando a comunicação mais clara, estratégica e orientada a resultados.

A bio ideal deve seguir 4 critérios essenciais:
1. Profissão/Nome: usar o nicho ou ocupação no nome do perfil para facilitar buscas e posicionamento.
2. Serviço claro: deixar explícito o que a pessoa faz logo nas primeiras linhas.
3. Autoridade/Diferencial: mostrar experiência, especialização, método ou resultado que aumente a confiança.
4. Call to Action estratégico: incentivar uma ação alinhada ao objetivo do perfil.

Ajuste sempre sua análise com base no objetivo:
- Se o objetivo for crescer seguidores: priorize clareza, identificação e autoridade de nicho.
- Se o objetivo for vender: priorize proposta de valor, dor resolvida e CTA forte.
- Se o objetivo for gerar leads: priorize promessa clara + direcionamento para contato ou link.

REGRAS CRÍTICAS:
- A Nova Bio NÃO pode ultrapassar 149 caracteres.
- Responda APENAS através da tool call fornecida.`;

  const userMessage = `Analise esta bio de perfil do Instagram:

nome_usuario: ${profile.handle}
nome_completo: ${profile.full_name}
bio: ${(profile.bio_text || "").slice(0, 500)}
seguidores: ${profile.followers}
seguindo: ${profile.following}
publicacoes: ${profile.posts_count}
nicho: ${nicho}
objetivo: ${objetivo}

Avalie a bio nos 4 critérios, dê uma nota de 0 a 10, liste pontos fortes e melhorias, e reescreva a bio (máximo 149 caracteres).`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_bio",
              description: "Retorna a análise estruturada da bio do Instagram",
              parameters: {
                type: "object",
                properties: {
                  profession_name: { type: "string", enum: ["Presente", "Ausente"] },
                  service: { type: "string", enum: ["Presente", "Ausente"] },
                  authority: { type: "string", enum: ["Presente", "Ausente"] },
                  call_to_action: { type: "string", enum: ["Presente", "Ausente"] },
                  score: { type: "number", minimum: 0, maximum: 10 },
                  strengths: { type: "string", description: "Pontos fortes da bio atual" },
                  improvements: { type: "string", description: "Pontos de melhoria estratégicos" },
                  suggested_bio: { type: "string", description: "Nova bio otimizada (max 149 chars)" },
                  rationale: { type: "string", description: "Explicação da análise" },
                  cta_option: { type: "string", description: "CTA sugerido alinhado ao objetivo" },
                },
                required: ["profession_name", "service", "authority", "call_to_action", "score", "strengths", "improvements", "suggested_bio", "rationale", "cta_option"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_bio" } },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("OpenAI API error:", res.status, text);
      return null;
    }

    const data = await res.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("OpenAI: no tool call in response");
      return null;
    }

    const parsed = JSON.parse(toolCall.function.arguments) as AIBioResult;
    // Enforce 149 char limit
    if (parsed.suggested_bio && parsed.suggested_bio.length > 149) {
      parsed.suggested_bio = parsed.suggested_bio.slice(0, 149);
    }
    return parsed;
  } catch (err) {
    console.error("analyzeBioWithAI error:", (err as Error).message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Result builders ──────────────────────────────────────────

async function buildFreeResult(
  profile: ReturnType<typeof normalizeProfile>,
  posts: ReturnType<typeof normalizePosts>,
  nichoKey: string,
  nicho: string,
  objetivo: string,
) {
  // Try AI analysis first, fallback to template
  const aiResult = await analyzeBioWithAI(profile, nicho, objetivo);
  const templateBio = NICHO_BIOS[nichoKey] || NICHO_BIOS["default"];

  let topIdx = 0;
  let worstIdx = 0;
  for (let i = 1; i < posts.length; i++) {
    if (posts[i].metrics.engagement_score > posts[topIdx].metrics.engagement_score) topIdx = i;
    if (posts[i].metrics.engagement_score < posts[worstIdx].metrics.engagement_score) worstIdx = i;
  }

  const bio_suggestion = aiResult
    ? {
        current_bio: profile.bio_text,
        suggested_bio: aiResult.suggested_bio,
        rationale_short: aiResult.rationale,
        cta_option: aiResult.cta_option,
        score: aiResult.score,
        criteria: {
          profession_name: aiResult.profession_name,
          service: aiResult.service,
          authority: aiResult.authority,
          call_to_action: aiResult.call_to_action,
        },
        strengths: aiResult.strengths,
        improvements: aiResult.improvements,
      }
    : {
        current_bio: profile.bio_text,
        suggested_bio: templateBio.suggested,
        rationale_short: templateBio.rationale,
        cta_option: templateBio.cta,
      };

  return {
    profile,
    deliverables: {
      bio_suggestion,
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
  nicho: string,
  objetivo: string,
) {
  // Premium also gets AI bio analysis
  return buildFreeResult(profile, posts, nichoKey, nicho, objetivo).then((freeResult) => ({
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
    plan: "premium" as const,
  }));
}

// ── Auth helper ──────────────────────────────────────────────

interface AuthResult {
  authenticated: boolean;
  userId?: string;
  supabaseAdmin: ReturnType<typeof createClient>;
}

function getAuth(req: Request): AuthResult {
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "") || "";

  if (!authHeader?.startsWith("Bearer ") || token === anonKey) {
    return { authenticated: false, supabaseAdmin };
  }

  return { authenticated: true, supabaseAdmin };
}

async function resolveUser(req: Request): Promise<string | null> {
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "") || "";

  if (!authHeader?.startsWith("Bearer ") || token === anonKey) {
    return null;
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    anonKey,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user?.id) return null;
  return data.user.id;
}

// ── Main handler ─────────────────────────────────────────────

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

    // ── [1] Validate handle ──────────────────────────────────
    const cleanHandle = (handle || "").replace(/^@/, "").trim().toLowerCase();
    if (!cleanHandle || !HANDLE_REGEX.test(cleanHandle)) {
      return json({ code: "VALIDATION_ERROR", message: "Handle inválido" }, 422);
    }
    if (!nicho || !objetivo) {
      return json({ code: "VALIDATION_ERROR", message: "Nicho e objetivo são obrigatórios" }, 422);
    }

    // ── [2] Check auth + cache ───────────────────────────────
    const { supabaseAdmin } = getAuth(req);
    const userId = await resolveUser(req);

    // If authenticated, check cache first
    if (userId) {
      const { data: cachedResults } = await supabaseAdmin
        .from("analysis_result")
        .select("result_json")
        .eq("handle", cleanHandle)
        .eq("user_id", userId)
        .limit(1);

      if (cachedResults && cachedResults.length > 0) {
        return json({ success: true, data: cachedResults[0].result_json }, 200);
      }
    }

    // ── [3] Call Apify (scraping BEFORE auth gate) ───────────
    let rawProfile: ApifyProfile;
    try {
      rawProfile = await callApify(cleanHandle);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === "PRIVATE_PROFILE") return json({ code: "PRIVATE_PROFILE" }, 403);
      if (msg === "NOT_FOUND") return json({ code: "NOT_FOUND" }, 404);
      return json({ code: "TIMEOUT" }, 504);
    }

    // ── [4] Normalize + proxy avatar ─────────────────────────
    const profile = normalizeProfile(rawProfile);
    profile.avatar_url = await proxyAvatar(cleanHandle, profile.avatar_url, supabaseAdmin);
    const posts = normalizePosts(rawProfile.latestPosts || []);
    const nichoKey = Object.keys(NICHO_BIOS).includes(nicho!) ? nicho! : "default";

    // ── [5] If NOT authenticated → return pending_result ─────
    if (!userId) {
      const pendingResult = await buildFreeResult(profile, posts, nichoKey, nicho!, objetivo!);
      return json({ code: "AUTH_REQUIRED", pending_result: pendingResult }, 200);
    }

    // ── [6] Authenticated → check plan limits ────────────────
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

    // ── [7] Build result ─────────────────────────────────────
    const result = plan === "premium"
      ? await buildPremiumResult(profile, posts, nichoKey, nicho!, objetivo!)
      : await buildFreeResult(profile, posts, nichoKey, nicho!, objetivo!);

    // ── [8] Persist ──────────────────────────────────────────
    const { data: reqInsert } = await supabaseAdmin
      .from("analysis_request")
      .insert({
        user_id: userId,
        handle: cleanHandle,
        nicho: nicho!,
        objetivo: objetivo!,
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

    // ── [9] Mark free as used ────────────────────────────────
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
