import { supabase } from "@/integrations/supabase/client";
import type { AnalysisResult } from "@/types/analysis";
import type { ShowcaseProfile } from "@/components/ShowcaseCarousel";

/**
 * Fetch a cached showcase analysis from the database.
 * Returns the analysis_result.result_json if it exists for this handle,
 * otherwise builds a realistic demo result from pre-populated data.
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

  // Build a realistic demo result with locked premium content
  return buildDemoResult(profile);
}

/* ─── Pre-populated realistic data per profile ──────────────── */

interface ProfileDemo {
  bio: string;
  following: number;
  posts_count: number;
  bio_score: number;
  suggested_bio: string;
  rationale: string;
  top_caption: string;
  worst_caption: string;
  strengths: string;
  improvements: string;
}

const PROFILE_DATA: Record<string, ProfileDemo> = {
  biaborges: {
    bio: "🧴 CEO @baborgesoficial\n💄 Empresária & Influenciadora\n📍 São Paulo\n🔗 linktr.ee/biaborges",
    following: 1_842,
    posts_count: 4_312,
    bio_score: 7.2,
    suggested_bio: "CEO da Boca Rosa Company | Transformando beleza em negócio | Empreendedora e mãe do Cris 💛\n🛍 Conheça a Boca Rosa ↓",
    rationale: "A bio atual usa emojis como separadores mas não comunica proposta de valor clara. A sugestão destaca autoridade empresarial e cria conexão emocional.",
    top_caption: "Quando eu comecei a Boca Rosa Company todo mundo falou que não ia dar certo. Hoje a gente fatura 8 dígitos por ano...",
    worst_caption: "Domingão de sol ☀️ #domingo #lifestyle",
    strengths: "Marca pessoal forte, storytelling autêntico, transição influencer→empresária bem posicionada.",
    improvements: "Bio sem CTA direto para conversão. Poucos posts educativos sobre empreendedorismo para engajar audiência aspiracional.",
  },
  "thiago.nigro": {
    bio: "📚 Primo Rico | Investimentos\n🎓 +10M alunos educados\n💰 Investidor & Autor Best-Seller\n📖 Novo livro ↓",
    following: 512,
    posts_count: 3_847,
    bio_score: 8.4,
    suggested_bio: "Primo Rico | Já ajudei +10M de pessoas a investir melhor\n📚 Autor best-seller 'Do Mil ao Milhão'\n💰 Seu próximo passo financeiro ↓",
    rationale: "Bio já tem autoridade clara. Sugestão reforça prova social e direciona melhor o CTA para conversão.",
    top_caption: "Se você ganha R$3.000 por mês e fizer isso aqui, em 5 anos você tem R$100 mil guardados. Parece impossível? Faz a conta comigo...",
    worst_caption: "Foto do escritório novo 📸 #office #primorico",
    strengths: "Autoridade inquestionável no nicho, conteúdo educativo de alta qualidade, ganchos numéricos que geram curiosidade.",
    improvements: "Excesso de conteúdo pode diluir engajamento. Posts muito genéricos sobre lifestyle performam mal comparado ao educativo.",
  },
  francinyehlke: {
    bio: "🌟 Atriz & Influenciadora\n💄 Beleza | Lifestyle | Família\n📍 Curitiba/PR\n✨ Parcerias: contato@francinyehlke.com",
    following: 987,
    posts_count: 5_621,
    bio_score: 6.8,
    suggested_bio: "Atriz, criadora de conteúdo e mãe da Céu 🤍\nBeleza real, sem filtro e com muito humor\n💌 Parcerias ↓",
    rationale: "Bio muito genérica com categorias separadas por pipe. Sugestão humaniza com tom autêntico e destaca diferencial.",
    top_caption: "Tutorial de make que eu uso TODOS OS DIAS. 5 minutos e você sai pronta pra qualquer coisa. Salva esse vídeo! 💄",
    worst_caption: "Look do dia ✨ #ootd #fashion",
    strengths: "Autenticidade e humor nos vídeos, conexão forte com público feminino jovem, conteúdo de beleza prático.",
    improvements: "Posts sem CTA claro têm engajamento 60% menor. Stories poderiam ser mais estratégicos para direcionar vendas.",
  },
  camilacoutinho: {
    bio: "👗 Moda | Beleza | Viagens\n📝 Blogueira desde 2006\n🌎 Garotas Estúpidas\n📩 contato@garotasestupidas.com",
    following: 2_134,
    posts_count: 8_943,
    bio_score: 6.5,
    suggested_bio: "Pioneira da moda digital no Brasil desde 2006 🇧🇷\nCriadora do @garotasestupidas\n✨ Tendências, viagens e lifestyle ↓",
    rationale: "Bio não comunica o diferencial de ser pioneira. Sugestão usa autoridade temporal e posiciona como referência.",
    top_caption: "As 5 tendências de moda que vão dominar o verão 2026. A número 3 vocês vão pirar! Thread completa...",
    worst_caption: "Café da manhã em Paris 🥐 #paris #travel",
    strengths: "Credibilidade de 20 anos no mercado, curadoria de moda refinada, público fiel de alto poder aquisitivo.",
    improvements: "Engajamento caiu com formato foto estática. Reels curtos com trends de moda têm 3x mais alcance.",
  },
  mohindi: {
    bio: "🍳 Chef | Receitas que funcionam\n📺 YouTube: Manual da Cozinha Hindi\n🌮 Comida boa de verdade\n👇 Receita nova toda semana",
    following: 743,
    posts_count: 2_156,
    bio_score: 7.8,
    suggested_bio: "Chef que ensina receitas que FUNCIONAM de verdade 🍳\n+1M de pessoas cozinhando melhor\n🎥 Receita nova toda semana ↓",
    rationale: "Bio boa mas pode reforçar prova social. Sugestão adiciona número de seguidores como autoridade.",
    top_caption: "Essa receita de bolo de chocolate leva 3 ingredientes e fica MELHOR que de padaria. Receita completa no final do vídeo 🍫",
    worst_caption: "Almoço de domingo em família 🍝 #food #homemade",
    strengths: "Formato de receitas práticas com alta salvabilidade, ganchos curiosos, produção visual apetitosa.",
    improvements: "Poderia explorar mais formatos como 'desafios culinários' e collabs para ampliar alcance.",
  },
  nortonmello: {
    bio: "💪 Personal Trainer\n🏋️ Transformações reais\n📍 São Paulo\n⬇️ Programa de treino",
    following: 1_256,
    posts_count: 1_834,
    bio_score: 7.0,
    suggested_bio: "Personal Trainer | +500 transformações reais documentadas 💪\nTreino inteligente > treino pesado\n🏋️ Comece sua transformação ↓",
    rationale: "Bio genérica de personal. Sugestão diferencia com número de transformações e filosofia de treino.",
    top_caption: "Meu aluno perdeu 22kg em 6 meses fazendo ISSO. Não é dieta maluca, é ciência. Vou te mostrar o passo a passo...",
    worst_caption: "Dia de perna 🦵 #legday #gym #fitness",
    strengths: "Prova social com antes/depois, conteúdo educativo sobre treino, abordagem acessível.",
    improvements: "Hashtags genéricas (#fitness #gym) não atraem público qualificado. Formato carrossel educativo pode aumentar salvamentos.",
  },
  whinderssonnunes: {
    bio: "😂 Humor | Música | Reflexões\n🎤 Turnê 2026\n📍 Pelo Brasil\n🎬 YouTube: +40M inscritos",
    following: 423,
    posts_count: 6_789,
    bio_score: 7.5,
    suggested_bio: "O maior comediante digital do Brasil 🇧🇷\n🎤 Turnê 2026 — ingressos esgotando\n😂 Humor com verdade ↓",
    rationale: "Bio subutiliza o potencial de conversão para shows. Sugestão cria urgência e reforça posicionamento.",
    top_caption: "POV: você descobriu que seu amigo não tempera o frango 😭 (essa história é real e eu preciso contar pra vocês)...",
    worst_caption: "Vibes ✌️ #mood",
    strengths: "Alcance massivo, storytelling natural, capacidade de viralizar qualquer formato, audiência extremamente engajada.",
    improvements: "Posts sem contexto narrativo performam mal. Conteúdo de humor funciona 10x mais quando tem storytelling pessoal.",
  },
  manualdomundo: {
    bio: "🔬 Ciência e Curiosidades\n📺 YouTube: +18M inscritos\n🧪 Experimentos que explodem sua mente\n👨‍👩‍👧‍👦 Família Manual do Mundo",
    following: 312,
    posts_count: 2_987,
    bio_score: 8.2,
    suggested_bio: "Transformando ciência em diversão desde 2008 🧪\n📺 +18M no YouTube | Família Manual do Mundo\n🔬 Experimento novo toda semana ↓",
    rationale: "Bio já é boa. Sugestão reforça longevidade e consistência como diferencial.",
    top_caption: "O que acontece quando você joga 10 QUILOS de gelo seco numa piscina? 🌊 O resultado é INSANO (e a física por trás é incrível)...",
    worst_caption: "Bastidores do estúdio 🎬 #behindthescenes",
    strengths: "Conteúdo educativo com altíssimo valor de entretenimento, formato único, autoridade científica acessível.",
    improvements: "Instagram é secundário vs YouTube. Reels adaptados dos vídeos longos com ganchos mais curtos podem dobrar o engajamento.",
  },
  eduardofeldberg: {
    bio: "💰 Finanças com humor\n😂 Fazendo você rir enquanto aprende\n📊 Investimentos descomplicados\n👇 Curso gratuito",
    following: 876,
    posts_count: 1_543,
    bio_score: 7.6,
    suggested_bio: "Finanças sem cara de banco 😂💰\nVocê vai rir, aprender e investir — nessa ordem\n📊 Curso gratuito ↓",
    rationale: "Bio boa mas pode ser mais memorável. Sugestão usa o tom humorístico que é o diferencial do perfil.",
    top_caption: "Se o Neymar investisse os R$87 milhões que ele gasta por mês em renda fixa, ele teria... (fiz a conta e chorei)...",
    worst_caption: "Bom dia, mercado! 📈 #bolsadevalores #investimentos",
    strengths: "Combinação única de humor + educação financeira, ganchos com celebridades, linguagem acessível.",
    improvements: "Posts genéricos de 'bom dia mercado' não engajam. O diferencial é o humor — todo post deveria ter esse elemento.",
  },
  virginia: {
    bio: "👨‍👩‍👧‍👦 Mãe da Maria Alice, Maria Flor e José Leonardo\n💄 @wepinkoficial\n🏠 Goiânia/SP\n📩 Parcerias: contato@virginia.com.br",
    following: 567,
    posts_count: 12_345,
    bio_score: 7.0,
    suggested_bio: "Mãe, empresária e a maior influenciadora do Brasil 🇧🇷\n💄 Fundadora @wepinkoficial\n👨‍👩‍👧‍👦 Maria Alice, Maria Flor e Zé Leonardo ↓",
    rationale: "Bio não comunica escala do perfil. Sugestão posiciona como a maior influenciadora e destaca empresa.",
    top_caption: "A Maria Alice aprendeu a falar 'mamãe' e eu CHOREI no meio do shopping. Não estava preparada pra isso 😭💛...",
    worst_caption: "Boa noite 🌙 #goodnight",
    strengths: "Conexão emocional fortíssima com público, autenticidade, volume de conteúdo diário mantém audiência ativa.",
    improvements: "Posts sem contexto emocional ou familiar performam muito abaixo da média. O público quer Virginia mãe, não Virginia genérica.",
  },
};

/**
 * Builds a realistic AnalysisResult for showcase display.
 * Shows real-looking profile info + locked placeholders so visitors see
 * what an analysis looks like, but premium content stays locked.
 */
function buildDemoResult(profile: ShowcaseProfile): AnalysisResult {
  const demo = PROFILE_DATA[profile.handle] || getDefaultDemo(profile);

  return {
    profile: {
      handle: profile.handle,
      full_name: profile.name,
      avatar_url: profile.avatar_url,
      bio_text: demo.bio,
      followers: profile.followers,
      following: demo.following,
      posts_count: demo.posts_count,
      is_verified: profile.is_verified,
    },
    deliverables: {
      bio_suggestion: {
        current_bio: demo.bio,
        suggested_bio: demo.suggested_bio,
        rationale_short: demo.rationale,
        cta_option: "",
        score: demo.bio_score,
        score_new: Math.min(demo.bio_score + 1.8, 10),
        criteria: { clarity: 3, authority: 4, cta: 2, seo: 3, brand_voice: 4, specificity: 3 },
        criteria_new: { clarity: 5, authority: 5, cta: 4, seo: 4, brand_voice: 5, specificity: 4 },
        diagnostic: {
          proposta_valor: "Desbloqueie a análise completa para ver este diagnóstico detalhado.",
          segmentacao_publico: "Desbloqueie a análise completa para ver este diagnóstico detalhado.",
          gatilhos_autoridade: "Desbloqueie a análise completa para ver este diagnóstico detalhado.",
          cta_conversao: "Desbloqueie a análise completa para ver este diagnóstico detalhado.",
          seo_instagram: "Desbloqueie a análise completa para ver este diagnóstico detalhado.",
          tom_de_voz: "Desbloqueie a análise completa para ver este diagnóstico detalhado.",
        },
        strengths: demo.strengths,
        improvements: demo.improvements,
      },
      top_post: {
        post_id: `${profile.handle}_top`,
        permalink: `https://instagram.com/${profile.handle}`,
        thumb_url: `https://picsum.photos/seed/${profile.handle}top/400/400`,
        caption_preview: demo.top_caption,
        metrics: {
          likes: Math.round(profile.followers * (profile.engagement / 100) * 0.8),
          comments: Math.round(profile.followers * (profile.engagement / 100) * 0.05),
          views: Math.round(profile.followers * 0.3),
          engagement_score: profile.engagement / 100,
        },
        tier: "gold",
        analysis: {
          resumo_desempenho: "Post com alta performance — desbloqueie para ver a análise completa.",
          fatores_positivos: ["Gancho que gera curiosidade imediata", "Storytelling pessoal e autêntico", "CTA implícito que gera comentários"],
          fatores_negativos: ["Desbloqueie para ver os pontos de melhoria"],
          analise_gancho: "Desbloqueie a análise PRO para ver.",
          analise_legenda: "Desbloqueie a análise PRO para ver.",
          analise_formato: "Desbloqueie a análise PRO para ver.",
          analise_hashtags: "Desbloqueie a análise PRO para ver.",
          rubrica: { gancho: 5, legenda: 4, formato: 5, engajamento: 4, estrategia: 4 },
          nota_geral: 8.6,
          recomendacoes: ["Desbloqueie para ver recomendações personalizadas"],
          classificacao: "gold",
        },
      },
      worst_post: {
        post_id: `${profile.handle}_worst`,
        permalink: `https://instagram.com/${profile.handle}`,
        thumb_url: `https://picsum.photos/seed/${profile.handle}worst/400/400`,
        caption_preview: demo.worst_caption,
        metrics: {
          likes: Math.round(profile.followers * (profile.engagement / 100) * 0.15),
          comments: Math.round(profile.followers * (profile.engagement / 100) * 0.008),
          views: Math.round(profile.followers * 0.08),
          engagement_score: (profile.engagement / 100) * 0.2,
        },
        tier: "bronze",
        analysis: {
          resumo_desempenho: "Post com baixa performance — desbloqueie para entender o porquê.",
          fatores_positivos: ["Visual bem produzido"],
          fatores_negativos: ["Desbloqueie para ver os fatores negativos detalhados"],
          analise_gancho: "Desbloqueie a análise PRO para ver.",
          analise_legenda: "Desbloqueie a análise PRO para ver.",
          analise_formato: "Desbloqueie a análise PRO para ver.",
          analise_hashtags: "Desbloqueie a análise PRO para ver.",
          rubrica: { gancho: 2, legenda: 2, formato: 2, engajamento: 1, estrategia: 2 },
          nota_geral: 3.2,
          recomendacoes: ["Desbloqueie para ver recomendações"],
          classificacao: "bronze",
        },
      },
      next_post_suggestion: {
        format: "Reels",
        hook: "Você está cometendo esse erro?",
        outline: ["Apresente o erro comum do nicho", "Mostre a consequência real", "Entregue a solução prática"],
        cta: "Comente QUERO para receber o modelo",
        angle: "Conteúdo educativo",
      },
    },
    limits: { posts_analyzed: 9, note: "Análise demonstrativa" },
    plan: "free",
  };
}

function getDefaultDemo(profile: ShowcaseProfile): ProfileDemo {
  return {
    bio: `${profile.name} | ${profile.nicheLabel}`,
    following: 500,
    posts_count: 2000,
    bio_score: 7.0,
    suggested_bio: `${profile.name} | Referência em ${profile.nicheLabel}`,
    rationale: "Bio pode ser otimizada para melhor conversão.",
    top_caption: "Conteúdo de alto engajamento deste perfil...",
    worst_caption: "Post com menor engajamento...",
    strengths: "Perfil com boa presença digital.",
    improvements: "Oportunidades de melhoria identificadas na análise.",
  };
}
