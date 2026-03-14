import { supabase } from "@/integrations/supabase/client";
import type { AnalysisResult } from "@/types/analysis";
import type { ShowcaseProfile } from "@/components/ShowcaseCarousel";

/**
 * Fetch a cached showcase analysis from the database.
 * Returns the analysis_result.result_json if it exists for this handle,
 * otherwise builds a minimal demo result from the showcase profile data.
 */
export async function fetchShowcaseResult(
  profile: ShowcaseProfile,
): Promise<AnalysisResult> {
  // Try to fetch real analysis from DB
  try {
    const { data } = await supabase
      .from("analysis_result")
      .select("result_json")
      .eq("handle", profile.handle)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data?.result_json) {
      const result = data.result_json as unknown as AnalysisResult;
      // Force plan to "free" so content appears locked in showcase mode
      return { ...result, plan: "free" };
    }
  } catch {
    // No saved analysis — fall through to demo
  }

  // Build a demo result with locked content
  return buildDemoResult(profile);
}

/**
 * Builds a minimal AnalysisResult for showcase display.
 * Shows profile info + locked placeholders so visitors see
 * what an analysis looks like, but all content is locked.
 */
function buildDemoResult(profile: ShowcaseProfile): AnalysisResult {
  return {
    profile: {
      handle: profile.handle,
      full_name: profile.name,
      avatar_url: profile.avatar_url,
      bio_text: "",
      followers: profile.followers,
      following: 0,
      posts_count: 0,
      is_verified: profile.is_verified,
    },
    deliverables: {
      bio_suggestion: {
        current_bio: "",
        suggested_bio: "Conteúdo bloqueado — faça sua própria análise para ver",
        rationale_short: "Faça sua análise para descobrir como melhorar sua bio.",
        cta_option: "",
        score: profile.healthScore / 10,
        score_new: Math.min((profile.healthScore / 10) + 2, 10),
        criteria: { clarity: 3, authority: 3, cta: 3, seo: 3, brand_voice: 3, specificity: 3 },
        criteria_new: { clarity: 4, authority: 5, cta: 5, seo: 4, brand_voice: 4, specificity: 4 },
        diagnostic: {
          proposta_valor: "Faça sua análise para ver este diagnóstico.",
          segmentacao_publico: "Faça sua análise para ver este diagnóstico.",
          gatilhos_autoridade: "Faça sua análise para ver este diagnóstico.",
          cta_conversao: "Faça sua análise para ver este diagnóstico.",
          seo_instagram: "Faça sua análise para ver este diagnóstico.",
          tom_de_voz: "Faça sua análise para ver este diagnóstico.",
        },
        strengths: "Faça sua análise para ver.",
        improvements: "Faça sua análise para ver.",
      },
      top_post: {
        post_id: "demo_top",
        permalink: `https://instagram.com/${profile.handle}`,
        thumb_url: `https://picsum.photos/seed/${profile.handle}top/400/400`,
        caption_preview: "Conteúdo de alto engajamento deste perfil...",
        metrics: {
          likes: Math.round(profile.followers * (profile.engagement / 100) * 0.8),
          comments: Math.round(profile.followers * (profile.engagement / 100) * 0.05),
          views: Math.round(profile.followers * 0.3),
          engagement_score: profile.engagement / 100,
        },
        tier: "gold",
        analysis: {
          resumo_desempenho: "Post com alta performance — desbloqueie para ver a análise completa.",
          fatores_positivos: ["Gancho chamativo", "Formato com alta distribuição", "CTA claro"],
          fatores_negativos: ["Desbloqueie para ver"],
          analise_gancho: "Desbloqueie para ver a análise do gancho.",
          analise_legenda: "Desbloqueie para ver a análise da legenda.",
          analise_formato: "Desbloqueie para ver a análise do formato.",
          analise_hashtags: "Desbloqueie para ver a análise das hashtags.",
          rubrica: { gancho: 4, legenda: 4, formato: 5, engajamento: 4, estrategia: 4 },
          nota_geral: 8.2,
          recomendacoes: ["Desbloqueie para ver recomendações personalizadas"],
          classificacao: "gold",
        },
      },
      worst_post: {
        post_id: "demo_worst",
        permalink: `https://instagram.com/${profile.handle}`,
        thumb_url: `https://picsum.photos/seed/${profile.handle}worst/400/400`,
        caption_preview: "Post com menor engajamento deste perfil...",
        metrics: {
          likes: Math.round(profile.followers * (profile.engagement / 100) * 0.2),
          comments: Math.round(profile.followers * (profile.engagement / 100) * 0.01),
          views: Math.round(profile.followers * 0.1),
          engagement_score: (profile.engagement / 100) * 0.3,
        },
        tier: "bronze",
        analysis: {
          resumo_desempenho: "Post com baixa performance — desbloqueie para entender o porquê.",
          fatores_positivos: ["Visual bem produzido"],
          fatores_negativos: ["Desbloqueie para ver os fatores negativos"],
          analise_gancho: "Desbloqueie para ver.",
          analise_legenda: "Desbloqueie para ver.",
          analise_formato: "Desbloqueie para ver.",
          analise_hashtags: "Desbloqueie para ver.",
          rubrica: { gancho: 2, legenda: 2, formato: 2, engajamento: 2, estrategia: 2 },
          nota_geral: 3.4,
          recomendacoes: ["Desbloqueie para ver recomendações"],
          classificacao: "bronze",
        },
      },
      next_post_suggestion: {
        format: "Reels",
        hook: "Você está cometendo esse erro?",
        outline: ["Apresente o erro comum", "Mostre a consequência", "Entregue a solução"],
        cta: "Comente QUERO para receber o modelo",
        angle: "Conteúdo educativo",
      },
    },
    limits: { posts_analyzed: 9, note: "Análise demonstrativa" },
    plan: "free",
  };
}
