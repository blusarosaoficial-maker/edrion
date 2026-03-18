import { supabase } from "@/integrations/supabase/client";
import type { AnalysisResult, ObjectiveKey, BioSuggestion, WeeklyContentPlan, StoriesPlan, BestTimesRecommendation, FormatMixRecommendation, HashtagStrategy } from "@/types/analysis";
import type { ShowcaseProfile } from "@/components/ShowcaseCarousel";
import { SHOWCASE_PROFILE_DATA } from "./showcase-data";
import type { ShowcaseProfileData } from "./showcase-data/types";

const STORAGE_BASE = "https://glgocjuwmssnaztljdus.supabase.co/storage/v1/object/public";

/**
 * Fetch a cached showcase analysis from the database.
 * If not found, builds a complete demo result with real data.
 * Showcase analyses show FULL free-tier content (bio analysis, raio-x,
 * post metrics, strengths/improvements) to demonstrate value.
 * Only premium content (weekly plan, stories, full post analysis) stays locked.
 */
export async function fetchShowcaseResult(
  profile: ShowcaseProfile,
): Promise<AnalysisResult> {
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
      return { ...result, plan: "free" };
    }
  } catch {
    // No saved analysis — use pre-populated demo
  }

  return buildShowcaseResult(profile);
}

const OBJECTIVE_ESTRATEGIAS: Record<ObjectiveKey, { bio_suffix: string; weekly_estrategia: string; stories_estrategia: string }> = {
  crescer: {
    bio_suffix: "Foco em crescimento de seguidores e alcance",
    weekly_estrategia: "Conteúdo focado em atrair novos seguidores com ganchos virais e temas de alto alcance",
    stories_estrategia: "Stories projetados para maximizar compartilhamentos e seguidores novos",
  },
  engajar: {
    bio_suffix: "Foco em conexão emocional e interação",
    weekly_estrategia: "Conteúdo focado em criar diálogo e interação intensa com a audiência",
    stories_estrategia: "Stories com enquetes, quizzes e caixas de perguntas para máxima interação",
  },
  vender: {
    bio_suffix: "Foco em conversão e vendas",
    weekly_estrategia: "Conteúdo focado em converter seguidores em clientes com provas sociais e CTAs diretos",
    stories_estrategia: "Stories com gatilhos de urgência, depoimentos e links de compra",
  },
  autoridade: {
    bio_suffix: "Foco em posicionamento de especialista",
    weekly_estrategia: "Conteúdo focado em demonstrar expertise e construir credibilidade no nicho",
    stories_estrategia: "Stories educativos com bastidores, dados e posicionamento como referência",
  },
};

function deriveObjectiveVariants(d: ShowcaseProfileData) {
  const objectives: ObjectiveKey[] = ["crescer", "engajar", "vender", "autoridade"];

  // Derive objective bios
  const objective_bios = {} as Record<ObjectiveKey, BioSuggestion>;
  for (const obj of objectives) {
    objective_bios[obj] = {
      current_bio: d.bio,
      suggested_bio: d.suggested_bio,
      rationale_short: OBJECTIVE_ESTRATEGIAS[obj].bio_suffix,
      cta_option: d.cta_option,
    };
  }

  // Derive objective content plans (reuse base scripts with different estrategia)
  const objective_content_plans = {} as Record<ObjectiveKey, WeeklyContentPlan>;
  for (const obj of objectives) {
    objective_content_plans[obj] = {
      scripts: d.weekly_content_plan.scripts.slice(0, 7),
      estrategia_semanal: OBJECTIVE_ESTRATEGIAS[obj].weekly_estrategia,
    };
  }

  // Derive objective stories plans (use first 7 sequences with different estrategia)
  const objective_stories_plans = {} as Record<ObjectiveKey, StoriesPlan>;
  for (const obj of objectives) {
    objective_stories_plans[obj] = {
      sequences: d.stories_plan.sequences.slice(0, 7),
      estrategia_stories: OBJECTIVE_ESTRATEGIAS[obj].stories_estrategia,
    };
  }

  // Generate enrichment data
  const best_times: BestTimesRecommendation = {
    slots: [
      { day: "Segunda", time: "19:00", rationale: "Início da semana, audiência busca motivação" },
      { day: "Terça", time: "12:00", rationale: "Horário de almoço com alto uso de redes" },
      { day: "Quarta", time: "20:00", rationale: "Meio da semana, pico de engagement noturno" },
      { day: "Quinta", time: "18:30", rationale: "Fim do expediente, transição para lazer" },
      { day: "Sexta", time: "17:00", rationale: "Clima de fim de semana começa" },
      { day: "Sábado", time: "10:00", rationale: "Manhã relaxada, alto consumo de conteúdo" },
      { day: "Domingo", time: "19:00", rationale: "Planejamento da semana, audiência receptiva" },
    ],
  };

  const format_mix: FormatMixRecommendation = {
    reels_pct: 50,
    carousels_pct: 30,
    stories_pct: 20,
    rationale: "Reels para alcance, carrosséis para educação e salvamentos, Stories para relacionamento diário",
  };

  const hashtag_strategy: HashtagStrategy = {
    high_competition: ["#instagram", "#reels", "#viral", "#trending", "#foryou"],
    medium_competition: ["#dicasinstagram", "#marketingdigital", "#empreendedorismo", "#crescimentoorganico", "#redessociais", "#conteudodigital", "#estrategiasdigitais", "#socialmedia", "#produtividadedigital", "#negociosonline"],
    low_competition: ["#dicasparainstagram", "#crescernoinstagram", "#conteudoparaempreendedores", "#marketingparainiciantes", "#negociodigital2024", "#estrategiasinstagram", "#engajamentoinstagram", "#crescimentoinstagram", "#dicasdeconteudo", "#instagramparaempresas", "#conteudoquevende", "#marketingestrategico", "#planejamentodeconteudo", "#instagramtips", "#crescanoinsta"],
    usage_tip: "Use 3-5 hashtags por post: 1 alta competição + 2 média + 2 baixa. Evite mais de 10 por post.",
  };

  return { objective_bios, objective_content_plans, objective_stories_plans, best_times, format_mix, hashtag_strategy };
}

function buildShowcaseResult(profile: ShowcaseProfile): AnalysisResult {
  const d = SHOWCASE_PROFILE_DATA[profile.handle];
  if (!d) return buildFallbackResult(profile);

  return {
    profile: {
      handle: profile.handle,
      full_name: profile.name,
      avatar_url: profile.avatar_url,
      bio_text: d.bio,
      followers: profile.followers,
      following: d.following,
      posts_count: d.posts_count,
      is_verified: profile.is_verified,
    },
    deliverables: {
      bio_suggestion: {
        current_bio: d.bio,
        suggested_bio: d.suggested_bio,
        rationale_short: d.rationale,
        cta_option: d.cta_option,
        score: d.bio_score,
        score_new: d.bio_score_new,
        criteria: d.criteria,
        criteria_new: d.criteria_new,
        diagnostic: {
          proposta_valor: d.proposta_valor,
          segmentacao_publico: d.segmentacao_publico,
          gatilhos_autoridade: d.gatilhos_autoridade,
          cta_conversao: d.cta_conversao,
          seo_instagram: d.seo_instagram,
          tom_de_voz: d.tom_de_voz,
        },
        strengths: d.strengths,
        improvements: d.improvements,
      },
      latest_post: {
        post_id: `${profile.handle}_latest`,
        permalink: `https://instagram.com/${profile.handle}`,
        thumb_url: `${STORAGE_BASE}/post-thumbnails/${profile.handle}/${profile.handle}_top.jpg`,
        caption_preview: d.top_caption,
        metrics: {
          likes: d.top_likes,
          comments: d.top_comments,
          views: d.top_views,
          engagement_score: d.top_engagement / 100,
        },
        tier: undefined,
        analysis: null,
      },
      top_post: {
        post_id: `${profile.handle}_top`,
        permalink: `https://instagram.com/${profile.handle}`,
        thumb_url: `${STORAGE_BASE}/post-thumbnails/${profile.handle}/${profile.handle}_top.jpg`,
        caption_preview: d.top_caption,
        metrics: {
          likes: d.top_likes,
          comments: d.top_comments,
          views: d.top_views,
          engagement_score: d.top_engagement / 100,
        },
        tier: "gold" as const,
        analysis: {
          resumo_desempenho: d.top_resumo,
          fatores_positivos: d.top_positivos,
          fatores_negativos: d.top_negativos,
          analise_gancho: d.top_gancho,
          analise_legenda: d.top_legenda,
          analise_formato: d.top_formato,
          analise_hashtags: d.top_hashtags,
          rubrica: d.top_rubrica,
          nota_geral: d.top_score,
          recomendacoes: d.top_recomendacoes,
          classificacao: "gold" as const,
        },
      },
      worst_post: {
        post_id: `${profile.handle}_worst`,
        permalink: `https://instagram.com/${profile.handle}`,
        thumb_url: `${STORAGE_BASE}/post-thumbnails/${profile.handle}/${profile.handle}_worst.jpg`,
        caption_preview: d.worst_caption,
        metrics: {
          likes: d.worst_likes,
          comments: d.worst_comments,
          views: d.worst_views,
          engagement_score: d.worst_engagement / 100,
        },
        tier: "bronze" as const,
        analysis: {
          resumo_desempenho: d.worst_resumo,
          fatores_positivos: d.worst_positivos,
          fatores_negativos: d.worst_negativos,
          analise_gancho: d.worst_gancho,
          analise_legenda: d.worst_legenda,
          analise_formato: d.worst_formato,
          analise_hashtags: d.worst_hashtags,
          rubrica: d.worst_rubrica,
          nota_geral: d.worst_score,
          recomendacoes: d.worst_recomendacoes,
          classificacao: "bronze" as const,
        },
      },
      next_post_suggestion: {
        format: d.next_format,
        hook: d.next_hook,
        outline: d.next_outline,
        cta: d.next_cta,
        angle: d.next_angle,
      },
      weekly_content_plan: d.weekly_content_plan,
      stories_plan: { ...d.stories_plan, sequences: d.stories_plan.sequences.slice(0, 7) },
      ...deriveObjectiveVariants(d),
    },
    selected_objetivo: "crescer",
    limits: { posts_analyzed: 9, note: "Análise demonstrativa" },
    plan: "free",
  };
}

function buildFallbackResult(profile: ShowcaseProfile): AnalysisResult {
  return {
    profile: {
      handle: profile.handle,
      full_name: profile.name,
      avatar_url: profile.avatar_url,
      bio_text: `${profile.name} | ${profile.nicheLabel}`,
      followers: profile.followers,
      following: 500,
      posts_count: 2000,
      is_verified: profile.is_verified,
    },
    deliverables: {
      bio_suggestion: {
        current_bio: `${profile.name} | ${profile.nicheLabel}`,
        suggested_bio: `${profile.name} | Referência em ${profile.nicheLabel}`,
        rationale_short: "Bio pode ser otimizada para melhor conversão.",
        cta_option: "",
        score: 5,
        score_new: 8,
        criteria: { clarity: 3, authority: 3, cta: 2, seo: 2, brand_voice: 3, specificity: 2 },
        criteria_new: { clarity: 5, authority: 5, cta: 4, seo: 4, brand_voice: 5, specificity: 4 },
        diagnostic: {
          proposta_valor: "A bio atual não comunica proposta de valor clara.",
          segmentacao_publico: "Sem segmentação visível de público-alvo.",
          gatilhos_autoridade: "Faltam gatilhos de autoridade e prova social.",
          cta_conversao: "Sem CTA para conversão de visitantes.",
          seo_instagram: "Faltam keywords para descoberta via busca.",
          tom_de_voz: "Tom pode ser melhor alinhado ao posicionamento.",
        },
        strengths: "Perfil com boa presença digital.",
        improvements: "Oportunidades de otimização na bio e conteúdo.",
      },
      latest_post: {
        post_id: `${profile.handle}_latest`,
        permalink: `https://instagram.com/${profile.handle}`,
        thumb_url: `${STORAGE_BASE}/post-thumbnails/${profile.handle}/${profile.handle}_top.jpg`,
        caption_preview: "Conteúdo de alto engajamento deste perfil.",
        metrics: {
          likes: Math.round(profile.followers * (profile.engagement / 100) * 0.8),
          comments: Math.round(profile.followers * (profile.engagement / 100) * 0.05),
          views: Math.round(profile.followers * 0.3),
          engagement_score: profile.engagement / 100,
        },
        tier: undefined,
        analysis: null,
      },
      top_post: {
        post_id: `${profile.handle}_top`,
        permalink: `https://instagram.com/${profile.handle}`,
        thumb_url: `${STORAGE_BASE}/post-thumbnails/${profile.handle}/${profile.handle}_top.jpg`,
        caption_preview: "Conteúdo de alto engajamento deste perfil.",
        metrics: {
          likes: Math.round(profile.followers * (profile.engagement / 100) * 0.8),
          comments: Math.round(profile.followers * (profile.engagement / 100) * 0.05),
          views: Math.round(profile.followers * 0.3),
          engagement_score: profile.engagement / 100,
        },
        tier: "gold",
        analysis: {
          resumo_desempenho: "Post com alta performance no perfil.",
          fatores_positivos: ["Gancho chamativo", "Conteúdo relevante"],
          fatores_negativos: ["Poderia ter CTA mais claro"],
          analise_gancho: "Gancho eficaz que retém atenção.",
          analise_legenda: "Legenda bem estruturada.",
          analise_formato: "Formato adequado ao nicho.",
          analise_hashtags: "Hashtags poderiam ser mais nichadas.",
          rubrica: { gancho: 4, legenda: 4, formato: 4, engajamento: 4, estrategia: 3 },
          nota_geral: 7.5,
          recomendacoes: ["Adicionar CTA direto para aumentar interação"],
          classificacao: "gold",
        },
      },
      worst_post: {
        post_id: `${profile.handle}_worst`,
        permalink: `https://instagram.com/${profile.handle}`,
        thumb_url: `${STORAGE_BASE}/post-thumbnails/${profile.handle}/${profile.handle}_worst.jpg`,
        caption_preview: "Post com menor engajamento do perfil.",
        metrics: {
          likes: Math.round(profile.followers * (profile.engagement / 100) * 0.15),
          comments: Math.round(profile.followers * (profile.engagement / 100) * 0.01),
          views: Math.round(profile.followers * 0.08),
          engagement_score: (profile.engagement / 100) * 0.2,
        },
        tier: "bronze",
        analysis: {
          resumo_desempenho: "Post com baixa performance.",
          fatores_positivos: ["Boa qualidade visual"],
          fatores_negativos: ["Sem gancho claro", "Caption genérica"],
          analise_gancho: "Sem gancho para reter atenção.",
          analise_legenda: "Caption genérica sem valor.",
          analise_formato: "Formato com baixa distribuição.",
          analise_hashtags: "Hashtags genéricas sem impacto.",
          rubrica: { gancho: 2, legenda: 2, formato: 2, engajamento: 2, estrategia: 2 },
          nota_geral: 3.0,
          recomendacoes: ["Adicionar storytelling e contexto ao post"],
          classificacao: "bronze",
        },
      },
      next_post_suggestion: {
        format: "Reels",
        hook: "O erro que todo mundo comete no Instagram",
        outline: ["Apresentar o erro", "Mostrar a consequência", "Dar a solução"],
        cta: "Salva esse post e aplica hoje",
        angle: "Conteúdo educativo",
      },
    },
    limits: { posts_analyzed: 9, note: "Análise demonstrativa" },
    plan: "free",
  };
}
