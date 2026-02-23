import { supabase } from "@/integrations/supabase/client";
import type { AnalysisResponse, AnalysisResult, PostData, PostMetrics } from "@/types/analysis";

// ── Real API call ──────────────────────────────────────────────

export async function analyzeProfile(
  handle: string,
  nicho: string,
  objetivo: string,
): Promise<AnalysisResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("edrion-analyze", {
      body: { handle, nicho, objetivo },
    });

    if (error) {
      // Network / CORS error — fallback to mock in dev
      if (import.meta.env.DEV) {
        console.warn("Edge function error, using mock:", error);
        return analyzeMock(handle, nicho, objetivo);
      }
      return { success: false, error: "timeout" };
    }

    // Map response codes
    if (data?.code === "EMAIL_REQUIRED") {
      return { success: false, error: "email_required", pending_result: data.pending_result };
    }
    if (data?.code === "FREE_LIMIT_REACHED") {
      return { success: false, error: "free_limit" };
    }
    if (data?.code === "HANDLE_ALREADY_ANALYZED") {
      return { success: false, error: "handle_taken" };
    }
    if (data?.code === "PRIVATE_PROFILE") {
      return { success: false, error: "private" };
    }
    if (data?.code === "NOT_FOUND") {
      return { success: false, error: "not_found" };
    }
    if (data?.code === "TIMEOUT") {
      return { success: false, error: "timeout" };
    }
    if (data?.code === "VALIDATION_ERROR") {
      return { success: false, error: "timeout" };
    }

    if (data?.success && data?.data) {
      return { success: true, data: data.data };
    }

    return { success: false, error: "timeout" };
  } catch {
    if (import.meta.env.DEV) {
      return analyzeMock(handle, nicho, objetivo);
    }
    return { success: false, error: "timeout" };
  }
}

export async function saveAfterSignup(
  handle: string,
  nicho: string,
  objetivo: string,
  pendingResult: AnalysisResult,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke("edrion-save-after-signup", {
      body: { handle, nicho, objetivo, pending_result: pendingResult },
    });
    if (error) return false;
    return data?.success === true;
  } catch {
    return false;
  }
}

// ── Mock (dev fallback) ────────────────────────────────────────

const AVATARS = [
  "https://i.pravatar.cc/150?img=1",
  "https://i.pravatar.cc/150?img=3",
  "https://i.pravatar.cc/150?img=5",
  "https://i.pravatar.cc/150?img=8",
];

const POST_THUMBS = [
  "https://picsum.photos/seed/p1/400/400",
  "https://picsum.photos/seed/p2/400/400",
  "https://picsum.photos/seed/p3/400/400",
  "https://picsum.photos/seed/p4/400/400",
  "https://picsum.photos/seed/p5/400/400",
  "https://picsum.photos/seed/p6/400/400",
  "https://picsum.photos/seed/p7/400/400",
  "https://picsum.photos/seed/p8/400/400",
  "https://picsum.photos/seed/p9/400/400",
];

const NICHO_BIOS: Record<string, { current: string; suggested: string; rationale: string; cta: string }> = {
  fitness: {
    current: "💪 Treino pesado | Vida saudável",
    suggested: "Transformo corpos em 12 semanas com treino e dieta personalizados. +500 alunos. ⬇️ Comece agora",
    rationale: "Bio genérica sem proposta de valor clara nem prova social",
    cta: "Agende sua avaliação gratuita",
  },
  marketing: {
    current: "📈 Marketing Digital | Empreendedor",
    suggested: "Ajudo negócios a faturar 6 dígitos com tráfego pago. Resultados em 30 dias ou devolvemos. ⬇️",
    rationale: "Falta especificidade no serviço e garantia para o cliente",
    cta: "Solicite seu diagnóstico gratuito",
  },
  gastronomia: {
    current: "🍕 Comida boa todo dia",
    suggested: "Chef de cozinha com receitas práticas em até 15 min. +200 receitas testadas. ⬇️ Cardápio semanal grátis",
    rationale: "Bio não comunica expertise nem diferencial",
    cta: "Baixe o cardápio da semana",
  },
  moda: {
    current: "👗 Fashion | Style",
    suggested: "Consultora de imagem: vista-se com intenção e destaque-se sem gastar mais. ⬇️ Quiz de estilo grátis",
    rationale: "Bio em inglês perde conexão com público brasileiro",
    cta: "Descubra seu estilo em 2 minutos",
  },
  default: {
    current: "✨ Conteúdo de qualidade",
    suggested: "Especialista em [seu nicho] ajudando [público] a alcançar [resultado]. ⬇️ Entre em contato",
    rationale: "Bio vaga sem proposta de valor específica",
    cta: "Fale comigo no direct",
  },
};

const CAPTIONS_BY_NICHO: Record<string, string[]> = {
  fitness: [
    "3 exercícios que vão mudar seu shape 💪",
    "O erro que trava seu emagrecimento",
    "Café da manhã fit em 5 min",
    "Treino de perna completo (salva!)",
    "Quanto de proteína você precisa?",
    "Antes e depois: 90 dias de foco",
    "Mitos do jejum intermitente",
    "Snack proteico receita rápida",
    "Por que você não ganha massa muscular",
  ],
  marketing: [
    "3 erros que queimam seu orçamento de ads",
    "Como escalar de R$1k pra R$10k/dia",
    "Copy que converte: fórmula prática",
    "Funil de vendas simplificado",
    "ROI de 5x: o que eu fiz diferente",
    "Tráfego pago vs orgânico em 2025",
    "Landing page que vende: checklist",
    "Por que seu lead é caro demais",
    "Automação que salvou meu tempo",
  ],
  default: [
    "Conteúdo que gera resultado",
    "3 dicas que ninguém te conta",
    "O segredo por trás dos bastidores",
    "Antes e depois do meu processo",
    "Erro #1 que iniciantes cometem",
    "Passo a passo completo (salva!)",
    "Por que você precisa começar hoje",
    "O método que mudou tudo pra mim",
    "Resultado real em pouco tempo",
  ],
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

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePosts(nicho: string): PostData[] {
  const captions = CAPTIONS_BY_NICHO[nicho] || CAPTIONS_BY_NICHO["default"];
  return Array.from({ length: 9 }, (_, i) => {
    const hasViews = Math.random() > 0.3;
    const likes = rand(50, 3000);
    const comments = rand(5, 200);
    const views = hasViews ? rand(1000, 50000) : 0;
    const engagement_score = views > 0
      ? parseFloat(((likes + 2 * comments) / views).toFixed(4))
      : likes + 2 * comments;

    return {
      post_id: `post_${Date.now()}_${i}`,
      permalink: `https://instagram.com/p/mock${i}`,
      thumb_url: POST_THUMBS[i],
      caption_preview: captions[i] || `Post #${i + 1}`,
      metrics: { likes, comments, views, engagement_score } as PostMetrics,
    };
  });
}

export async function analyzeMock(
  handle: string,
  nicho: string,
  _objetivo: string,
): Promise<AnalysisResponse> {
  const h = handle.toLowerCase();
  if (h === "privado") {
    await delay(800);
    return { success: false, error: "private" };
  }
  if (h === "naoexiste") {
    await delay(600);
    return { success: false, error: "not_found" };
  }
  if (h === "timeout") {
    await delay(5000);
    return { success: false, error: "timeout" };
  }

  await delay(rand(2500, 4500));

  const nichoKey = Object.keys(NICHO_BIOS).includes(nicho) ? nicho : "default";
  const posts = generatePosts(nichoKey);

  let topIdx = 0;
  let worstIdx = 0;
  for (let i = 1; i < posts.length; i++) {
    if (posts[i].metrics.engagement_score > posts[topIdx].metrics.engagement_score) topIdx = i;
    if (posts[i].metrics.engagement_score < posts[worstIdx].metrics.engagement_score) worstIdx = i;
  }

  const bio = NICHO_BIOS[nichoKey] || NICHO_BIOS["default"];
  const nextPost = NEXT_POST_BY_NICHO[nichoKey] || NEXT_POST_BY_NICHO["default"];

  return {
    success: true,
    data: {
      profile: {
        handle,
        full_name: handle.charAt(0).toUpperCase() + handle.slice(1).replace(/[._]/g, " "),
        avatar_url: AVATARS[rand(0, AVATARS.length - 1)],
        bio_text: bio.current,
        followers: rand(1200, 85000),
        following: rand(200, 1500),
        posts_count: rand(80, 600),
        is_verified: Math.random() > 0.85,
      },
      deliverables: {
        bio_suggestion: {
          current_bio: bio.current,
          suggested_bio: bio.suggested,
          rationale_short: bio.rationale,
          cta_option: bio.cta,
        },
        top_post: posts[topIdx],
        worst_post: posts[worstIdx],
        next_post_suggestion: nextPost,
      },
      limits: { posts_analyzed: 9, note: "Diagnóstico objetivo" },
      plan: "free",
    },
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
