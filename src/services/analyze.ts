import { supabase } from "@/integrations/supabase/client";
import type { AnalysisResponse, AnalysisResult } from "@/types/analysis";

// ── Helper ─────────────────────────────────────────────────────

function getEdgeFunctionUrl(fnName: string): string {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "glgocjuwmssnaztljdus";
  return `https://${projectId}.supabase.co/functions/v1/${fnName}`;
}

function getAnonKey(): string {
  return import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZ29janV3bXNzbmF6dGxqZHVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MjU4MDIsImV4cCI6MjA4NzEwMTgwMn0.csxQ7SNsjkLEi8ygxj8TP3CzIg-L6An6RVSCwbXay4s";
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const anonKey = getAnonKey();
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    "apikey": anonKey,
    "Authorization": `Bearer ${session?.access_token || anonKey}`,
  };
}

// ── Analyze profile ────────────────────────────────────────────

export async function analyzeProfile(
  handle: string,
  nicho: string,
  objetivo: string,
): Promise<AnalysisResponse> {
  try {
    const url = getEdgeFunctionUrl("edrion-analyze");
    const headers = await getAuthHeaders();

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ handle, nicho, objetivo }),
    });

    const responseData = await res.json();

    // AUTH_REQUIRED with pending_result (scraping done, needs login)
    if (responseData?.code === "AUTH_REQUIRED" && responseData?.pending_result) {
      return {
        success: false,
        error: "auth_required",
        pendingResult: responseData.pending_result as AnalysisResult,
      };
    }

    // AUTH_REQUIRED without pending_result (old-style)
    if (responseData?.code === "AUTH_REQUIRED") {
      return { success: false, error: "auth_required" };
    }

    if (responseData?.code === "FREE_LIMIT_REACHED") {
      return { success: false, error: "free_limit" };
    }
    if (responseData?.code === "PRIVATE_PROFILE") {
      return { success: false, error: "private" };
    }
    if (responseData?.code === "NOT_FOUND") {
      return { success: false, error: "not_found" };
    }
    if (responseData?.code === "TIMEOUT") {
      return { success: false, error: "timeout" };
    }
    if (responseData?.code === "VALIDATION_ERROR") {
      return { success: false, error: "timeout" };
    }

    if (responseData?.success && responseData?.data) {
      return { success: true, data: responseData.data };
    }

    return { success: false, error: "timeout" };
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn("Edge function error, using mock:", err);
      return analyzeMock(handle, nicho, objetivo);
    }
    return { success: false, error: "timeout" };
  }
}

// ── Save result (after auth) ───────────────────────────────────

export async function saveResult(
  handle: string,
  nicho: string,
  objetivo: string,
  result: AnalysisResult,
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = getEdgeFunctionUrl("edrion-save-result");
    const headers = await getAuthHeaders();

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ handle, nicho, objetivo, result }),
    });

    const data = await res.json();

    if (data?.code === "FREE_LIMIT_REACHED") {
      return { success: false, error: "free_limit" };
    }

    if (data?.success) {
      return { success: true };
    }

    return { success: false, error: data?.code || "unknown" };
  } catch {
    return { success: false, error: "network" };
  }
}

// ── Check user credits (client-side pre-check) ─────────────────

export async function checkUserCredits(): Promise<{
  canAnalyze: boolean;
  plan: string;
  freeUsed: boolean;
  credits: number;
  blocked?: boolean;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { canAnalyze: true, plan: "free", freeUsed: false, credits: 0 };

    // Check if user email is blocked
    if (user.email) {
      const isBlocked = await checkBlockedEmail(user.email);
      if (isBlocked) {
        return { canAnalyze: false, plan: "blocked", freeUsed: true, credits: 0, blocked: true };
      }
    }

    const { data: profile } = await supabase
      .from("users_profiles")
      .select("plan, free_analysis_used")
      .eq("id", user.id)
      .single();

    if (!profile) return { canAnalyze: true, plan: "free", freeUsed: false, credits: 0 };

    const plan = profile.plan || "free";
    const freeUsed = profile.free_analysis_used || false;

    if (plan === "premium") return { canAnalyze: true, plan, freeUsed, credits: 0 };
    if (!freeUsed) return { canAnalyze: true, plan, freeUsed, credits: 0 };

    return { canAnalyze: false, plan, freeUsed, credits: 0 };
  } catch {
    return { canAnalyze: true, plan: "free", freeUsed: false, credits: 0 };
  }
}

// ── Check blocked email ────────────────────────────────────────

export async function checkBlockedEmail(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("is_email_blocked", {
      p_email: email,
    });
    if (error) {
      console.error("Error checking blocked email:", error);
      return false;
    }
    return data === true;
  } catch {
    return false;
  }
}

// ── Mock (dev fallback) ────────────────────────────────────────

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function analyzeMock(
  handle: string,
  nicho: string,
  _objetivo: string,
): Promise<AnalysisResponse> {
  const h = handle.toLowerCase();
  if (h === "privado") { await delay(800); return { success: false, error: "private" }; }
  if (h === "naoexiste") { await delay(600); return { success: false, error: "not_found" }; }
  if (h === "timeout") { await delay(5000); return { success: false, error: "timeout" }; }

  await delay(rand(2500, 4500));

  const nichoKey = ["fitness", "marketing", "gastronomia", "moda"].includes(nicho) ? nicho : "default";

  const followers = rand(1200, 85000);
  const posts = Array.from({ length: 9 }, (_, i) => {
    const likes = rand(50, 3000);
    const comments = rand(5, 200);
    const views = Math.random() > 0.3 ? rand(1000, 50000) : 0;
    const isVideo = Math.random() > 0.4;
    const engagement_score = views > 0
      ? parseFloat(((likes + 3 * comments) / views).toFixed(4))
      : parseFloat(((likes + 3 * comments) / followers).toFixed(4));
    return {
      post_id: `post_${Date.now()}_${i}`,
      permalink: `https://instagram.com/p/mock${i}`,
      thumb_url: `https://picsum.photos/seed/p${i + 1}/400/400`,
      caption_preview: `Post de ${nichoKey} #${i + 1}`,
      full_caption: `Post de ${nichoKey} #${i + 1} — Conteúdo inspirador sobre ${nichoKey}. Compartilhe com quem precisa! #${nichoKey} #dicas #conteudo`,
      post_type: isVideo ? "Video" : "Image",
      hashtags: [`#${nichoKey}`, "#conteudo", "#dicas"],
      timestamp: new Date(Date.now() - i * 86400000).toISOString(),
      is_pinned: i === 0,
      has_location: Math.random() > 0.7,
      music_info: isVideo ? "Artista - Música" : null,
      metrics: { likes, comments, views, engagement_score, engagement_rate: engagement_score },
      tier: (engagement_score > 0.15 ? "gold" : engagement_score > 0.06 ? "silver" : "bronze") as "gold" | "silver" | "bronze",
      analysis: null as import("@/types/analysis").PostAnalysis | null,
    };
  });

  let topIdx = 0, worstIdx = 0;
  for (let i = 1; i < posts.length; i++) {
    if (posts[i].metrics.engagement_score > posts[topIdx].metrics.engagement_score) topIdx = i;
    if (posts[i].metrics.engagement_score < posts[worstIdx].metrics.engagement_score) worstIdx = i;
  }

  posts[topIdx].analysis = {
    resumo_desempenho: "Este post teve a melhor performance do perfil por combinar um gancho forte com formato adequado ao público. O engajamento ficou acima da média do perfil.",
    fatores_positivos: ["Gancho chamativo na primeira linha", "Formato com alta distribuição algorítmica", "Legenda com CTA claro"],
    fatores_negativos: ["Hashtags poderiam ser mais específicas do nicho"],
    analise_gancho: "A primeira linha cria curiosidade imediata, prendendo a atenção do espectador nos primeiros 3 segundos.",
    analise_legenda: "Boa estrutura com storytelling e chamada para ação no final. Uso adequado de emojis.",
    analise_formato: "Formato ideal para maximizar alcance e distribuição algorítmica em 2026.",
    analise_hashtags: "Mix adequado de hashtags mas poderia incluir hashtags de comunidade para ampliar descoberta.",
    rubrica: { gancho: 4, legenda: 4, formato: 5, engajamento: 3, estrategia: 4 },
    nota_geral: 8.0,
    recomendacoes: ["Adicione hashtags de comunidade do nicho", "Teste CTAs diferentes para aumentar salvamentos", "Mantenha esse formato como base do calendário editorial"],
    classificacao: "gold",
  };
  posts[topIdx].tier = "gold";

  posts[worstIdx].analysis = {
    resumo_desempenho: "Este post teve baixa performance por falta de gancho claro e formato desalinhado com o objetivo do perfil.",
    fatores_positivos: ["Visual limpo e bem produzido"],
    fatores_negativos: ["Sem gancho claro na primeira linha", "Legenda genérica sem valor entregue", "Formato de imagem limita alcance"],
    analise_gancho: "A legenda começa de forma genérica sem criar curiosidade ou identificação com o público.",
    analise_legenda: "Falta storytelling e CTA. Não entrega valor claro ao leitor.",
    analise_formato: "Imagem estática tem alcance limitado para esse tipo de conteúdo aspiracional.",
    analise_hashtags: "Poucas hashtags e muito genéricas, não ajudam na descoberta.",
    rubrica: { gancho: 2, legenda: 2, formato: 2, engajamento: 1, estrategia: 2 },
    nota_geral: 3.6,
    recomendacoes: ["Reformule como Reel para maior alcance", "Adicione gancho provocativo na primeira linha", "Inclua CTA pedindo para salvar ou compartilhar"],
    classificacao: "bronze",
  };
  posts[worstIdx].tier = "bronze";

  return {
    success: true,
    data: {
      profile: {
        handle,
        full_name: handle.charAt(0).toUpperCase() + handle.slice(1).replace(/[._]/g, " "),
        avatar_url: `https://i.pravatar.cc/150?img=${rand(1, 8)}`,
        bio_text: "✨ Conteúdo de qualidade",
        followers,
        following: rand(200, 1500),
        posts_count: rand(80, 600),
        is_verified: Math.random() > 0.85,
      },
      deliverables: {
        bio_suggestion: {
          current_bio: "✨ Conteúdo de qualidade",
          suggested_bio: "Ajudo seu público a crescer com estratégia\n+200 clientes transformados\nFale comigo no direct ⬇️",
          rationale_short: "A bio atual é vaga e não comunica transformação, público-alvo ou diferencial. A nova bio posiciona autoridade e direciona para ação.",
          cta_option: "Fale comigo no direct",
          score: 3.3,
          score_new: 8.0,
          criteria: {
            clarity: 2,
            authority: 1,
            cta: 2,
            seo: 1,
            brand_voice: 3,
            specificity: 1,
          },
          criteria_new: {
            clarity: 4,
            authority: 4,
            cta: 5,
            seo: 4,
            brand_voice: 4,
            specificity: 3,
          },
          diagnostic: {
            proposta_valor: "A bio atual não comunica o que a pessoa faz nem qual transformação entrega. Apenas um emoji genérico.",
            segmentacao_publico: "Público-alvo completamente ausente. Não há indicação de para quem o conteúdo é direcionado.",
            gatilhos_autoridade: "Nenhum elemento de prova social, autoridade ou diferencial presente.",
            cta_conversao: "Sem CTA. Não há direcionamento para próximo passo.",
            seo_instagram: "Sem keywords buscáveis no nome ou na bio.",
            tom_de_voz: "Informal e descontraído, uso de emoji decorativo.",
          },
          strengths: "Uso de emoji transmite leveza e personalidade.",
          improvements: "Falta proposta de valor, público-alvo, CTA e keywords de SEO.",
          name_keyword: `${handle} | Especialista em ${nichoKey}`,
          detected_tone: "informal e descontraído",
        },
        top_post: posts[topIdx],
        worst_post: posts[worstIdx],
        next_post_suggestion: {
          format: "reel",
          hook: "Você está cometendo esse erro?",
          outline: ["Apresente o erro", "Mostre consequência", "Entregue solução"],
          cta: "Comente QUERO para receber o modelo",
          angle: "Conteúdo educativo",
        },
      },
      limits: { posts_analyzed: 9, note: "Diagnóstico objetivo" },
      plan: "free",
    },
  };
}
