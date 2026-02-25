import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HANDLE_REGEX = /^[a-zA-Z0-9._]{1,30}$/;

const NICHO_BIOS: Record<string, { suggested: string; rationale: string; cta: string }> = {
  fitness: {
    suggested: "Transformo corpos em 12 semanas\nTreino + dieta personalizados\n⬇️ Comece agora",
    rationale: "Bio genérica sem proposta de valor clara nem prova social",
    cta: "Agende sua avaliação gratuita",
  },
  marketing: {
    suggested: "Ajudo negócios a faturar com tráfego pago\nResultados em 30 dias ou devolvemos\n⬇️ Solicite diagnóstico",
    rationale: "Falta especificidade no serviço e garantia para o cliente",
    cta: "Solicite seu diagnóstico gratuito",
  },
  gastronomia: {
    suggested: "Receitas práticas em até 15 min\nTestadas na prática por chef\n⬇️ Cardápio semanal grátis",
    rationale: "Bio não comunica expertise nem diferencial",
    cta: "Baixe o cardápio da semana",
  },
  moda: {
    suggested: "Vista-se com intenção e destaque-se\nConsultora de imagem pessoal\n⬇️ Quiz de estilo grátis",
    rationale: "Bio em inglês perde conexão com público brasileiro",
    cta: "Descubra seu estilo em 2 minutos",
  },
  default: {
    suggested: "Especialista em [seu nicho]\nAjudando [público] a [resultado]\n⬇️ Entre em contato",
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
  type?: string;
  hashtags?: string[];
  mentions?: string[];
  timestamp?: string;
  productType?: string;
  isPinned?: boolean;
  musicInfo?: { artist_name?: string; song_name?: string; uses_original_audio?: boolean };
  locationName?: string;
  taggedUsers?: unknown[];
  images?: string[];
  videoUrl?: string;
  alt?: string;
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
  externalUrl?: string;
  bioLinks?: Array<{ title?: string; url?: string; lynxUrl?: string; linkType?: string }>;
}

// ── Anti-hallucination validator ─────────────────────────────

function validateBioHallucinations(
  bioSugerida: string,
  originalBio: string,
  captions: string[],
): string {
  // Regex to find numerical claims: +500, 140 empresas, R$1M, 6 dígitos, etc.
  const numericClaimRegex = /(?:\+?\d[\d.,]*\s*(?:k|mil|milhões?|milhoes?|M|bi|empresas?|clientes?|alunos?|pacientes?|protocolos?|semanas?|dias?|meses?|anos?|dígitos?|digitos?|projetos?|pessoas?|%|reais?))|(?:R\$\s*[\d.,]+[kKmM]?)|(?:mais\s+de\s+\d[\d.,]*)|(?:\d[\d.,]*\s*(?:em\s+faturamento|de\s+faturamento))/gi;

  const claims = bioSugerida.match(numericClaimRegex);
  if (!claims || claims.length === 0) {
    return bioSugerida; // No numerical claims, safe
  }

  // Build searchable corpus from source data
  const corpus = [originalBio, ...captions].join(" ").toLowerCase();

  let sanitized = bioSugerida;
  for (const claim of claims) {
    const numberMatch = claim.match(/\d[\d.,]*/);
    if (!numberMatch) continue;
    const num = numberMatch[0];

    // Check if this number exists in source data
    if (corpus.includes(num)) continue;

    // Hallucinated claim — remove the numeric phrase
    const escaped = num.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const claimPattern = new RegExp(
      `\\s*(?:por\\s+)?(?:mais\\s+de\\s+)?\\+?${escaped}[\\d.,]*\\s*(?:k|mil|milhões?|milhoes?|M|bi|empresas?|clientes?|alunos?|pacientes?|protocolos?|semanas?|dias?|meses?|anos?|dígitos?|digitos?|projetos?|pessoas?|%|reais?)?\\s*(?:em\\s+\\w+)?`,
      "gi",
    );
    sanitized = sanitized.replace(claimPattern, " ");
  }

  sanitized = sanitized.replace(/[^\S\n]{2,}/g, " ").replace(/\n{3,}/g, "\n").trim();

  // If sanitization made bio too short, keep original
  if (sanitized.length < 30) return bioSugerida;

  return sanitized;
}

function validateBioTextClaims(
  bioSugerida: string,
  originalBio: string,
  captions: string[],
): string {
  // Terms that indicate specific offers/products — only allowed if present in source corpus
  const offerTerms = /\b(masterclass|workshop|curso|ebook|e-book|mentoria|consultoria|programa|método|metodo|imersão|imersao|treinamento|bootcamp|guia|planilha|template|checklist|webinar|aula)\b/gi;

  const matches = bioSugerida.match(offerTerms);
  if (!matches || matches.length === 0) return bioSugerida;

  const corpus = [originalBio, ...captions].join(" ").toLowerCase();

  let result = bioSugerida;
  for (const term of matches) {
    if (corpus.includes(term.toLowerCase())) continue;

    // Hallucinated term — remove the line that contains it
    const lines = result.split("\n");
    result = lines.filter((line) => !line.toLowerCase().includes(term.toLowerCase())).join("\n");
  }

  // If too much was removed, keep original
  if (result.trim().length < 30) return bioSugerida;

  return result.trim();
}

function enforceBioQuality(bio: string, objetivo: string): string {
  let lines = bio.split("\n").map((l) => l.trim()).filter(Boolean);

  // CTA indicators — directional emojis or action words in last line
  const ctaPattern = /👇|↓|👉|➡|link|bio|clique|acesse|saiba|confira|descubra|comece|agende|entre|fale/i;
  const hasCTA = lines.length > 0 && ctaPattern.test(lines[lines.length - 1]);

  if (!hasCTA) {
    const ctaMap: Record<string, string> = {
      crescer: "Conteúdo que transforma 👇",
      engajar: "Confira o conteúdo 👇",
      vender: "Saiba mais 👇",
      autoridade: "Descubra mais 👇",
      consistencia: "Acompanhe a jornada 👇",
    };
    lines.push(ctaMap[objetivo] || "Saiba mais 👇");
  }

  // Ensure exactly 3 lines: keep first, merge middle, keep last (CTA)
  if (lines.length > 3) {
    const first = lines[0];
    const last = lines[lines.length - 1];
    const middle = lines.slice(1, -1).join(" | ");
    lines = [first, middle, last];
  }

  let result = lines.join("\n");
  if (result.length > 149) result = result.slice(0, 149);
  return result;
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
    bio_link: raw.externalUrl || raw.bioLinks?.[0]?.url || "",
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

async function proxyPostThumbnail(
  handle: string,
  postId: string,
  originalUrl: string,
  supabaseAdmin: ReturnType<typeof createClient>,
): Promise<string> {
  if (!originalUrl) return originalUrl;
  try {
    const res = await fetch(originalUrl);
    if (!res.ok) throw new Error(`fetch thumbnail ${res.status}`);
    const blob = await res.blob();
    const arrayBuf = await blob.arrayBuffer();
    const filePath = `${handle}/${postId}.jpg`;

    await supabaseAdmin.storage.from("post-thumbnails").remove([filePath]);

    const { error: uploadErr } = await supabaseAdmin.storage
      .from("post-thumbnails")
      .upload(filePath, new Uint8Array(arrayBuf), {
        contentType: blob.type || "image/jpeg",
        upsert: true,
      });

    if (uploadErr) throw uploadErr;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    return `${supabaseUrl}/storage/v1/object/public/post-thumbnails/${filePath}`;
  } catch (err) {
    console.warn("proxyPostThumbnail fallback to original:", (err as Error).message);
    return originalUrl;
  }
}

// ── Video transcription ─────────────────────────────────────

async function transcribeVideo(
  videoUrl: string,
  usesOriginalAudio: boolean | null,
  musicInfo: string | null,
): Promise<{ text: string | null; skipped_reason: string | null }> {
  if (!videoUrl) {
    return { text: null, skipped_reason: null };
  }

  if (usesOriginalAudio === false) {
    return { text: null, skipped_reason: `Audio e musica da biblioteca (${musicInfo || "desconhecida"}). Transcricao de fala nao aplicavel.` };
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return { text: null, skipped_reason: "API indisponivel" };

  try {
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error(`fetch video ${videoRes.status}`);

    const blob = await videoRes.blob();
    if (blob.size > 25 * 1024 * 1024) {
      return { text: null, skipped_reason: "Video muito longo para transcricao (>25MB)" };
    }

    const formData = new FormData();
    formData.append("file", new File([blob], "video.mp4", { type: "video/mp4" }));
    formData.append("model", "gpt-4o-mini-transcribe");
    formData.append("language", "pt");
    formData.append("response_format", "json");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}` },
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Whisper API error:", res.status, errText);
      return { text: null, skipped_reason: "Erro na transcricao" };
    }

    const result = await res.json();
    const transcript = result.text?.trim() || "";

    if (transcript.length < 20) {
      return { text: null, skipped_reason: "Audio sem fala detectavel (possivelmente musica ou instrumental)" };
    }

    return { text: transcript, skipped_reason: null };
  } catch (err) {
    console.warn("transcribeVideo error:", (err as Error).message);
    return { text: null, skipped_reason: "Erro ao processar audio" };
  }
}

// ── Data helpers ─────────────────────────────────────────────

function normalizePosts(posts: ApifyPost[], followers: number) {
  const normalized = posts.slice(0, 9).map((p, i) => {
    const likes = p.likesCount || 0;
    const comments = p.commentsCount || 0;
    const views = p.videoViewCount || 0;
    const isVideo = p.type === "Video" || p.productType === "clips";

    // Engagement: comments weighted 3x (deeper engagement signal)
    // Videos use views as denominator; images/carousels use followers
    let engagement_rate: number;
    if (isVideo && views > 0) {
      engagement_rate = (likes + 3 * comments) / views;
    } else if (followers > 0) {
      engagement_rate = (likes + 3 * comments) / followers;
    } else {
      engagement_rate = likes + 3 * comments;
    }
    const engagement_score = parseFloat(engagement_rate.toFixed(6));

    return {
      post_id: p.id || p.shortCode || `post_${i}`,
      permalink: p.url || (p.shortCode ? `https://instagram.com/p/${p.shortCode}` : ""),
      thumb_url: p.displayUrl || "",
      caption_preview: (p.caption || "").slice(0, 120),
      full_caption: (p.caption || "").slice(0, 2200),
      post_type: p.type || (p.productType === "clips" ? "Video" : "Image"),
      hashtags: p.hashtags || [],
      mentions: p.mentions || [],
      timestamp: p.timestamp || "",
      is_pinned: p.isPinned || false,
      has_location: !!p.locationName,
      music_info: p.musicInfo
        ? `${p.musicInfo.artist_name || "Unknown"} - ${p.musicInfo.song_name || "Unknown"}${p.musicInfo.uses_original_audio ? " (audio original)" : ""}`
        : null,
      video_url: isVideo ? (p.videoUrl || "") : "",
      uses_original_audio: p.musicInfo?.uses_original_audio ?? null,
      metrics: { likes, comments, views, engagement_score, engagement_rate: engagement_score },
      tier: "bronze" as "gold" | "silver" | "bronze",
      analysis: null as unknown,
    };
  });

  // Classify tiers relative to account average
  if (normalized.length > 0) {
    const avg = normalized.reduce((s, p) => s + p.metrics.engagement_score, 0) / normalized.length;
    for (const post of normalized) {
      if (post.metrics.engagement_score > avg * 2) post.tier = "gold";
      else if (post.metrics.engagement_score >= avg) post.tier = "silver";
      else post.tier = "bronze";
    }
  }

  return normalized;
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

interface AIBioRubric {
  clareza: number;
  autoridade: number;
  forca_cta: number;
  seo_descoberta: number;
  voz_da_marca: number;
  especificidade: number;
}

interface AIBioResult {
  analise_diagnostica: {
    proposta_valor: string;
    segmentacao_publico: string;
    gatilhos_autoridade: string;
    cta_conversao: string;
    seo_instagram: string;
    tom_de_voz: string;
  };
  rubrica_bio_atual: AIBioRubric;
  nota_geral: number;
  pontos_fortes: string;
  pontos_de_melhoria: string;
  sugestao_keyword_nome: string;
  bio_sugerida: string;
  rubrica_bio_nova: AIBioRubric;
  justificativa_bio: string;
  cta_sugerido: string;
  bio_variacao_autoridade: string;
  bio_variacao_conexao: string;
  bio_variacao_acao: string;
}

async function analyzeBioWithAI(
  profile: ReturnType<typeof normalizeProfile>,
  nicho: string,
  objetivo: string,
  captions: string[] = [],
): Promise<AIBioResult | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    console.warn("OPENAI_API_KEY not set, falling back to template");
    return null;
  }

  const systemPrompt = `Você é uma especialista sênior em Social Selling, copywriting de alta conversão, SEO para Instagram e posicionamento estratégico de perfis profissionais.

<missao>

Sua missão é executar um processo de duas fases: primeiro, realizar uma análise diagnóstica profunda da bio atual; segundo, ADAPTAR e OTIMIZAR a bio existente para torná-la mais estratégica e alinhada ao objetivo do perfil. Você não cria bios do zero — você evolui a bio atual preservando identidade e tom. Toda resposta DEVE ser enviada exclusivamente via tool call fornecida.

</missao>

<fase_1_analise_diagnostica>

Antes de gerar qualquer sugestão, você DEVE raciocinar passo a passo sobre a bio atual. Execute cada etapa na ordem:

ETAPA 1 — PROPOSTA DE VALOR ATUAL:

- O que essa pessoa faz está claro em até 3 segundos de leitura?

- A bio comunica TRANSFORMAÇÃO (resultado para o cliente) ou apenas FUNÇÃO (o que a pessoa é)?

- Identifique: público-alvo mencionado? Resultado específico prometido? Método ou diferencial?

ETAPA 2 — SEGMENTAÇÃO DE PÚBLICO:

- É possível identificar PARA QUEM essa pessoa fala?

- O público-alvo está implícito, explícito ou ausente?

- Quão específico é o direcionamento? (ex: "empreendedores" = genérico | "dentistas que querem lotar a agenda" = específico)

ETAPA 3 — GATILHOS E AUTORIDADE:

- Existem elementos de prova social, autoridade ou credibilidade?

- Há gatilhos emocionais (dor, desejo, urgência, exclusividade)?

- O que diferencia essa pessoa de outros profissionais do mesmo nicho?

ETAPA 4 — CTA E CONVERSÃO:

- Existe chamada para ação? É clara e alinhada ao objetivo?

- O CTA direciona para o próximo passo lógico do funil?

- Há uso estratégico de emoji direcional (👇, 👉, ↓) para guiar o olhar?

ETAPA 5 — SEO NO INSTAGRAM:

- O campo Nome contém palavra-chave buscável do nicho?

- A bio contém termos que o público-alvo pesquisaria na lupa do Instagram?

- As keywords estão inseridas de forma natural (não forçada)?

ETAPA 6 — ANÁLISE DE TOM DE VOZ:

Extraia do perfil (bio atual + legendas recentes, se disponíveis):

- 3+ palavras ou expressões características do vocabulário do usuário

- Padrão de comprimento de frases (curtas e diretas vs. longas e explicativas)

- Nível de formalidade (formal / semiformal / informal / descontraído)

- Registro emocional predominante (inspiracional / técnico / acolhedor / provocativo / humorístico / direto)

- Se a bio atual e legendas estiverem vazias, adote tom profissional e acessível como padrão.

RUBRICA DE AVALIAÇÃO DA BIO ATUAL (pontue de 1 a 5 cada critério):

| Critério | 1 (Fraco) | 3 (Mediano) | 5 (Excelente) |

|---|---|---|---|

| Clareza | Confuso, não se entende o que faz | Entende-se parcialmente | Cristalino em 3 segundos |

| Autoridade | Zero prova ou diferencial | Algum elemento genérico | Prova específica e convincente |

| Força do CTA | Sem CTA | CTA genérico | CTA irresistível e alinhado ao objetivo |

| SEO/Descoberta | Sem keywords | Keyword no nome apenas | Keywords naturais no nome e bio |

| Voz da Marca | Inconsistente ou genérica | Parcialmente alinhada | Autêntica e memorável |

| Especificidade | Totalmente genérico | Parcialmente específico | Público + resultado + método claros |

</fase_1_analise_diagnostica>

<fase_2_geracao_estrategica>

Com base na análise da Fase 1, ADAPTE a bio atual seguindo estas diretrizes. A bio sugerida deve ser uma evolução reconhecível da bio original — não uma bio completamente diferente. Preserve:
- Elementos de identidade que já funcionam (tom, estilo, termos-chave do usuário)
- Informações factuais presentes na bio atual
- Referências a produtos/serviços que o usuário JÁ menciona

Melhore:
- Estrutura (aplique o formato de 3 linhas se possível)
- Clareza da proposta de valor
- Força do CTA
- SEO e descoberta

Diretrizes:

ESTRUTURA ÓTIMA (3 LINHAS):

Linha 1: Quem você ajuda + qual transformação entrega

Linha 2: Prova de autoridade / diferencial / método único

Linha 3: CTA estratégico com emoji direcional

PRINCÍPIOS DE GERAÇÃO:

1. TRANSFORMAÇÃO, NÃO FUNÇÃO:

- ERRADO: "Nutricionista esportiva"

- CERTO: "Ajudo atletas a performar no pico com alimentação estratégica"

- Sempre responda à pergunta implícita do visitante: "O que essa pessoa pode fazer POR MIM?"

2. ESPECIFICIDADE OBRIGATÓRIA:

- Mencione o público-alvo específico (não genérico)

- Inclua o resultado concreto ou a dor resolvida

- Se possível, mencione o método, abordagem ou diferencial

3. DIFERENCIAÇÃO COMPETITIVA:

- O que torna essa pessoa ÚNICA no nicho?

- Evite frases que qualquer concorrente poderia usar

- Priorize o ângulo que só essa pessoa pode reivindicar

4. ESTRATÉGIA DE EMOJI:

- Use 1-2 emojis no máximo (bio limpa > bio poluída)

- Emojis direcionais (👇 ↓ 👉) no CTA aumentam cliques em 15-20%

- Emojis temáticos só se forem parte da identidade de marca do usuário

- Na dúvida, use apenas emoji direcional no CTA

5. SEO PARA INSTAGRAM:

- Sugira keyword para o campo Nome (ex: "Maria | Nutricionista Esportiva")

- Use 1-2 termos buscáveis naturalmente na bio

- Priorize palavras que o público-alvo digitaria na busca do Instagram

6. FORMATAÇÃO INSTAGRAM:

- Cada linha deve ser escaneável independentemente

- Quebras de linha criam hierarquia visual

- Regra dos 3 segundos: o visitante decide relevância em 3 segundos

AJUSTE POR OBJETIVO:

- Crescer seguidores → priorize identificação imediata, clareza de nicho, autoridade que gera curiosidade

- Vender → priorize dor resolvida, proposta de valor irresistível, CTA direto para compra/link

- Gerar leads → priorize promessa clara de resultado, direcionamento para contato/link/isca digital

PRESERVAÇÃO DE TOM:

A nova bio DEVE usar o mesmo tom de voz identificado na Etapa 6 da análise. Use vocabulário, estilo de frase e registro emocional compatíveis. A estratégia muda, a voz permanece.

REGRA DO LINK DA BIO:

- Se o link da bio for fornecido, o CTA da bio sugerida DEVE ser genérico e compatível com qualquer página de destino (ex: "Saiba mais 👇", "Link na bio 👇", "Comece aqui 👇")

- NUNCA mencione ou descreva o conteúdo do link (você não sabe o que está lá)

- NUNCA invente nomes de produtos, cursos, masterclasses, ebooks ou ofertas que não estejam EXPLICITAMENTE mencionados na bio atual ou nas legendas

- Se a bio atual menciona algo específico no CTA (ex: "Baixe o guia"), você pode manter ou adaptar essa referência

AUTO-AVALIAÇÃO OBRIGATÓRIA:

Após gerar a nova bio, pontue-a na mesma rubrica de 6 critérios (1-5). Se qualquer critério ficar abaixo de 4, revise internamente antes de apresentar. A bio final apresentada deve ter pontuação mínima de 4 em todos os critérios.

TRÊS VARIAÇÕES ESTRATÉGICAS:

Além da bio principal (que é a evolução direta da bio atual), gere 3 variações com ângulos estratégicos diferentes. Cada variação deve:
- Respeitar as mesmas regras (max 149 chars, 3 linhas, sem alucinações)
- Usar APENAS informações presentes na bio atual e legendas
- Ter um ângulo estratégico distinto:

Variação 1 — AUTORIDADE: Lidera com credenciais, expertise e prova social. Foco em "por que confiar nessa pessoa".
Variação 2 — CONEXÃO: Lidera com personalidade, identificação e empatia. Foco em "essa pessoa me entende".
Variação 3 — AÇÃO: Lidera com proposta de valor e CTA direto. Foco em "o que essa pessoa pode fazer por mim".

</fase_2_geracao_estrategica>

<exemplos_referencia>

EXEMPLO 1 — Profissional de Saúde:

Nicho: Nutricionista esportiva | Objetivo: Vender consultorias

Bio atual: "Nutri | CRN 12345 | Consultório em SP | Atendo presencial e online"

Problemas: Função em vez de transformação, sem público-alvo, sem CTA, zero diferencial

Nova bio:

"Nutrição estratégica p/ atletas que querem performance máxima

Protocolos personalizados | Método NutriPeak

Agende sua avaliação 👇"

(148 caracteres)

Por que funciona: Transformação clara, público específico, método proprietário, CTA com emoji direcional.

EXEMPLO 2 — Marketing Digital:

Nicho: Social media para negócios locais | Objetivo: Gerar leads

Bio atual: "Especialista em redes sociais | Apaixonada por marketing | Criatividade e resultados"

Problemas: Genérico, sem público, "apaixonada" não é diferencial, sem CTA

Nova bio:

"Loto a agenda de negócios locais com Instagram estratégico

Método testado com negócios locais de SP

Diagnóstico grátis no link 👇"

(128 caracteres)

Por que funciona: Resultado concreto (lotar agenda), público (negócios locais), método testado como prova social, CTA com isca (diagnóstico grátis).

EXEMPLO 3 — Psicóloga (tom acolhedor):

Nicho: Psicologia para mulheres ansiosas | Objetivo: Crescer seguidores

Bio atual: "Psi | Te ajudo a encontrar leveza nos dias pesados | CRP 06/xxxxx | Terapia online"

Problemas: Bom tom, mas público vago, sem diferencial, sem CTA

Nova bio:

"Te ajudo a sair do piloto automático da ansiedade

Psi clínica | Abordagem ACT | Terapia online

Conteúdo que acolhe e transforma 👇"

(133 caracteres)

Por que funciona: Manteve tom acolhedor ("te ajudo", "acolhe"), especificou a dor (ansiedade), adicionou diferencial (ACT), CTA para conteúdo (objetivo = seguidores).

</exemplos_referencia>

<regras_criticas>

1. A nova bio NÃO PODE ultrapassar 149 caracteres. Conte caractere por caractere. Quebras de linha contam como 1 caractere cada.

2. Responda APENAS e EXCLUSIVAMENTE através da tool call fornecida. Nunca responda em texto livre.

3. Sempre execute a Fase 1 completa antes da Fase 2.

4. A auto-avaliação é obrigatória — não pule.

5. Se o usuário não informar o nicho ou objetivo, pergunte antes de analisar.

6. Sugestão de keyword para o campo Nome é obrigatória em toda análise.

7. Nunca use clichês vazios: "apaixonado por", "amante de", "especialista em ajudar pessoas".

8. Priorize verbos de ação e resultado sobre substantivos abstratos.

9. Cada linha da bio deve funcionar sozinha se lida isoladamente.

10. NUNCA invente dados, números, métricas, conquistas, nomes de produtos, cursos, métodos, ofertas ou qualquer informação que não esteja EXPLICITAMENTE presente na bio atual ou nas legendas fornecidas. Se uma informação não aparece no texto fonte, ela NÃO EXISTE para você. Use apenas: (a) o que está escrito na bio, (b) temas recorrentes das legendas, (c) o nicho e objetivo informados. Credibilidade falsa é pior que nenhuma credibilidade.

11. A bio sugerida deve ser uma EVOLUÇÃO ESTRATÉGICA da bio atual — não uma bio inventada do zero. Mantenha elementos que já funcionam (tom, identidade, diferenciais reais). Melhore estrutura, clareza, CTA e SEO. A personalidade do perfil deve ser reconhecível na bio nova.

12. TODA bio sugerida (principal e variações) DEVE obrigatoriamente conter CTA na linha 3 com emoji direcional (👇, ↓ ou 👉). Bio sem CTA é bio incompleta e será rejeitada. O CTA deve ser compatível com o objetivo do perfil.

</regras_criticas>`;

  const legendas = captions.length > 0 ? `\n\nLegendas recentes:\n${captions.map(c => `- "${c}"`).join("\n")}` : "";

  const userMessage = `Analise a bio do perfil @${profile.handle}.
Nicho: ${nicho}.
Objetivo principal: ${objetivo.toUpperCase()}.
Bio atual: ${(profile.bio_text || "").slice(0, 500)}
Link da bio: ${profile.bio_link || "(sem link)"}
Seguidores: ${profile.followers} | Seguindo: ${profile.following} | Posts: ${profile.posts_count}

Execute o processo completo de duas fases. Retorne analise diagnostica,
rubrica da bio atual (1-5 cada), pontos fortes/melhorias, keyword para Nome,
nova bio (max 149 chars), rubrica da bio nova, justificativa e CTA.${legendas}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "gpt-4o",
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
                  analise_diagnostica: {
                    type: "object",
                    properties: {
                      proposta_valor: { type: "string", description: "Análise da proposta de valor atual — comunica transformação ou apenas função?" },
                      segmentacao_publico: { type: "string", description: "Para quem essa pessoa fala? O público está explícito, implícito ou ausente?" },
                      gatilhos_autoridade: { type: "string", description: "Elementos de prova social, autoridade, gatilhos emocionais e diferenciais" },
                      cta_conversao: { type: "string", description: "Avaliação do CTA — existe? É claro? Está alinhado ao objetivo?" },
                      seo_instagram: { type: "string", description: "O campo Nome tem keyword? A bio tem termos buscáveis?" },
                      tom_de_voz: { type: "string", description: "Tom identificado: vocabulário, formalidade, registro emocional" },
                    },
                    required: ["proposta_valor", "segmentacao_publico", "gatilhos_autoridade", "cta_conversao", "seo_instagram", "tom_de_voz"],
                  },
                  rubrica_bio_atual: {
                    type: "object",
                    properties: {
                      clareza: { type: "number", minimum: 1, maximum: 5 },
                      autoridade: { type: "number", minimum: 1, maximum: 5 },
                      forca_cta: { type: "number", minimum: 1, maximum: 5 },
                      seo_descoberta: { type: "number", minimum: 1, maximum: 5 },
                      voz_da_marca: { type: "number", minimum: 1, maximum: 5 },
                      especificidade: { type: "number", minimum: 1, maximum: 5 },
                    },
                    required: ["clareza", "autoridade", "forca_cta", "seo_descoberta", "voz_da_marca", "especificidade"],
                  },
                  nota_geral: { type: "number", description: "Média das 6 notas da rubrica, convertida para escala /10. Calculada como: (soma das 6 notas / 30) * 10" },
                  pontos_fortes: { type: "string", description: "O que está funcionando bem na bio atual" },
                  pontos_de_melhoria: { type: "string", description: "O que precisa melhorar na bio atual" },
                  sugestao_keyword_nome: { type: "string", description: "Sugestão de keyword para o campo Nome do Instagram (ex: 'Micha | Marketing Digital Lo-Fi')" },
                  bio_sugerida: { type: "string", description: "Nova bio otimizada com no máximo 149 caracteres. DEVE conter exatamente 2 quebras de linha (\\n) para criar 3 linhas estratégicas. Formato: 'Linha1\\nLinha2\\nLinha3'. Cada \\n conta como 1 caractere no limite de 149.", maxLength: 149 },
                  rubrica_bio_nova: {
                    type: "object",
                    properties: {
                      clareza: { type: "number", minimum: 1, maximum: 5 },
                      autoridade: { type: "number", minimum: 1, maximum: 5 },
                      forca_cta: { type: "number", minimum: 1, maximum: 5 },
                      seo_descoberta: { type: "number", minimum: 1, maximum: 5 },
                      voz_da_marca: { type: "number", minimum: 1, maximum: 5 },
                      especificidade: { type: "number", minimum: 1, maximum: 5 },
                    },
                    required: ["clareza", "autoridade", "forca_cta", "seo_descoberta", "voz_da_marca", "especificidade"],
                  },
                  justificativa_bio: { type: "string", description: "Explicação de por que a nova bio é melhor que a atual, conectando com o objetivo do perfil" },
                  cta_sugerido: { type: "string", description: "CTA alternativo alinhado ao objetivo principal do perfil" },
                  bio_variacao_autoridade: { type: "string", description: "Bio alternativa: foco em autoridade e credenciais (max 149 chars, 3 linhas)" },
                  bio_variacao_conexao: { type: "string", description: "Bio alternativa: foco em conexao e personalidade (max 149 chars, 3 linhas)" },
                  bio_variacao_acao: { type: "string", description: "Bio alternativa: foco em proposta de valor e CTA (max 149 chars, 3 linhas)" },
                },
                required: ["analise_diagnostica", "rubrica_bio_atual", "nota_geral", "pontos_fortes", "pontos_de_melhoria", "sugestao_keyword_nome", "bio_sugerida", "rubrica_bio_nova", "justificativa_bio", "cta_sugerido", "bio_variacao_autoridade", "bio_variacao_conexao", "bio_variacao_acao"],
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
    // Validate and sanitize hallucinated claims (numeric + textual)
    if (parsed.bio_sugerida) {
      parsed.bio_sugerida = validateBioHallucinations(
        parsed.bio_sugerida,
        profile.bio_text,
        captions,
      );
      parsed.bio_sugerida = validateBioTextClaims(
        parsed.bio_sugerida,
        profile.bio_text,
        captions,
      );
    }
    // Enforce structural quality (3 lines + CTA) and 149 char limit
    if (parsed.bio_sugerida) {
      parsed.bio_sugerida = enforceBioQuality(parsed.bio_sugerida, objetivo);
    }
    // Validate and sanitize bio variations (same rules as main bio)
    for (const key of ["bio_variacao_autoridade", "bio_variacao_conexao", "bio_variacao_acao"] as const) {
      if (parsed[key]) {
        parsed[key] = validateBioHallucinations(parsed[key], profile.bio_text, captions);
        parsed[key] = validateBioTextClaims(parsed[key], profile.bio_text, captions);
        parsed[key] = enforceBioQuality(parsed[key], objetivo);
      }
    }
    return parsed;
  } catch (err) {
    console.error("analyzeBioWithAI error:", (err as Error).message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Post Analysis AI ─────────────────────────────────────────

interface AIPostRubric {
  gancho: number;
  legenda: number;
  formato: number;
  engajamento: number;
  estrategia: number;
}

interface AIPostAnalysis {
  resumo_desempenho: string;
  fatores_positivos: string[];
  fatores_negativos: string[];
  analise_gancho: string;
  analise_legenda: string;
  analise_formato: string;
  analise_hashtags: string;
  rubrica: AIPostRubric;
  nota_geral: number;
  recomendacoes: string[];
  classificacao: "gold" | "silver" | "bronze";
}

interface AIPostsResult {
  top_post_analysis: AIPostAnalysis;
  worst_post_analysis: AIPostAnalysis;
}

async function analyzePostsWithAI(
  profile: ReturnType<typeof normalizeProfile>,
  topPost: ReturnType<typeof normalizePosts>[number],
  worstPost: ReturnType<typeof normalizePosts>[number],
  allPosts: ReturnType<typeof normalizePosts>,
  nicho: string,
  objetivo: string,
  topTranscript?: string | null,
  worstTranscript?: string | null,
): Promise<AIPostsResult | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return null;

  const postSystemPrompt = `Voce e uma especialista senior em estrategia de conteudo para Instagram, analise de performance de posts e growth hacking para criadores de conteudo brasileiros.

<missao>
Sua missao e analisar dois posts de um perfil do Instagram: o post de melhor performance (TOP) e o post de pior performance (WORST). Para cada um, execute uma analise profunda e retorne via tool call.
</missao>

<contexto_limitacoes>
IMPORTANTE: Os unicos dados quantitativos disponiveis sao likes, comentarios e visualizacoes de video. NAO temos acesso a salvamentos, compartilhamentos, alcance ou impressoes. Sua analise deve focar na qualidade QUALITATIVA do conteudo (gancho, legenda, formato, estrategia) complementada pelos dados quantitativos disponiveis.
</contexto_limitacoes>

<processo_analise>

Para CADA post (top e worst), execute:

ETAPA 1 — RESUMO DE DESEMPENHO:
- Por que esse post performou bem (ou mal) comparado a media do perfil?
- Qual a relacao entre o tipo de conteudo e o engajamento obtido?
- Contextualize os numeros (likes, comments, views) em relacao ao tamanho do perfil (seguidores).

ETAPA 2 — ANALISE DO GANCHO:
- A primeira linha da legenda captura atencao?
- Se e video/reel: o formato visual tipicamente prende o espectador nos primeiros 3 segundos?
- O gancho gera curiosidade, identificacao ou urgencia?

ETAPA 2B — ANALISE DO AUDIO (somente se TRANSCRICAO DO AUDIO foi fornecida):
- Avalie o tom de voz: energia, clareza, ritmo de fala
- A fala complementa ou repete a legenda?
- O roteiro falado e estruturado (gancho vocal, desenvolvimento, CTA falado)?
- A pessoa transmite confianca, autoridade e autenticidade?
- Se NAO ha transcricao, ignore esta etapa completamente e retorne "N/A" no campo analise_audio.

ETAPA 3 — ANALISE DA LEGENDA:
- Qualidade do copywriting (storytelling, valor entregue, estrutura)
- Uso de emojis e formatacao (escaneabilidade)
- Presenca de CTA (call-to-action) — pede para salvar, compartilhar, comentar?
- Tamanho adequado para o formato?

ETAPA 4 — ANALISE DO FORMATO:
- O formato escolhido (Reel/Carrossel/Imagem) e o ideal para este tipo de conteudo?
- Reels tendem a ter mais alcance; carrosseis mais salvamentos; imagens mais para comunidade.
- O formato esta alinhado com o objetivo do perfil?

ETAPA 5 — ANALISE DE HASHTAGS:
- Quantidade de hashtags (ideal: 3-15 para 2025-2026)
- Mix de hashtags: nicho especifico vs. genericas vs. de comunidade?
- Hashtags alinhadas com o conteudo do post?

ETAPA 6 — ANALISE ESTRATEGICA:
- O post esta alinhado com o nicho e objetivo do perfil?
- Contribui para posicionamento, autoridade ou conversao?
- Timing e contexto do post

</processo_analise>

<rubrica_avaliacao>
Pontue de 1 a 5 cada criterio:

| Criterio | 1 (Fraco) | 3 (Mediano) | 5 (Excelente) |
|---|---|---|---|
| Gancho/Hook | Sem gancho, comeca generico | Gancho parcial, nao muito impactante | Gancho irresistivel que prende em 3s |
| Legenda/Caption | Sem valor, generica ou ausente | Entrega valor parcial, sem CTA | Storytelling envolvente + CTA claro |
| Formato | Formato errado para o conteudo | Formato OK mas poderia ser melhor | Formato perfeito para maximizar o objetivo |
| Engajamento | Nao provoca interacao | Algum elemento de interacao | Multiplos gatilhos de save/share/comment |
| Estrategia | Desalinhado do nicho/objetivo | Parcialmente alinhado | 100% alinhado, contribui para posicionamento |
</rubrica_avaliacao>

<tom_analise>
- Para o TOP post: tom celebratorio e analitico. Destaque o que foi bem feito. "Esse post e um exemplo de..."
- Para o WORST post: tom construtivo e mentor. Sem criticar, mas orientar. "Esse post tem oportunidade de melhoria em..."
- Sempre em portugues brasileiro, linguagem acessivel mas profissional.
</tom_analise>

<regras>
1. Responda APENAS via tool call fornecida.
2. Recomendacoes devem ser ESPECIFICAS e ACIONAVEIS (nao genericas como "melhore o gancho").
3. NUNCA invente dados, numeros ou metricas que nao estejam nos dados fornecidos.
4. Maximo 3-5 recomendacoes por post, priorizadas por impacto.
5. A classificacao (gold/silver/bronze) deve ser sua avaliacao qualitativa global do post.
6. Se nao temos views para um post de imagem, contextualize usando likes e comments vs seguidores.
7. A nota geral (0-10) deve refletir a media ponderada da rubrica: gancho e engajamento tem peso 1.5x.
</regras>`;

  const postsContext = allPosts.map((p, i) =>
    `Post ${i+1}: ${p.post_type} | Likes: ${p.metrics.likes} | Comments: ${p.metrics.comments} | Views: ${p.metrics.views} | Score: ${p.metrics.engagement_score} | Tier: ${p.tier}`
  ).join("\n");

  const formatPostDetail = (p: ReturnType<typeof normalizePosts>[number], label: string, transcript?: string | null) => `
--- ${label} ---
Tipo: ${p.post_type}
Legenda completa: "${p.full_caption}"
Hashtags: ${p.hashtags.length > 0 ? p.hashtags.join(", ") : "nenhuma"}
Likes: ${p.metrics.likes} | Comments: ${p.metrics.comments} | Views: ${p.metrics.views}
Engagement Score: ${p.metrics.engagement_score} | Tier quantitativo: ${p.tier}
Fixado: ${p.is_pinned ? "Sim" : "Nao"}
Localizacao: ${p.has_location ? "Sim" : "Nao"}
Musica: ${p.music_info || "N/A"}
Data: ${p.timestamp || "N/A"}${transcript ? `\nTRANSCRICAO DO AUDIO: "${transcript}"` : ""}`;

  const userMessage = `Analise os posts do perfil @${profile.handle}.
Nicho: ${nicho}. Objetivo: ${objetivo.toUpperCase()}.
Seguidores: ${profile.followers} | Posts totais: ${profile.posts_count}

CONTEXTO — Ultimos ${allPosts.length} posts (para comparacao relativa):
${postsContext}

${formatPostDetail(topPost, "TOP POST (melhor performance)", topTranscript)}

${formatPostDetail(worstPost, "WORST POST (pior performance)", worstTranscript)}

Execute a analise completa para ambos os posts.`;

  const postAnalysisSchema = {
    type: "object" as const,
    properties: {
      resumo_desempenho: { type: "string" as const, description: "Resumo de por que esse post performou bem ou mal" },
      fatores_positivos: { type: "array" as const, items: { type: "string" as const }, description: "Fatores positivos de performance" },
      fatores_negativos: { type: "array" as const, items: { type: "string" as const }, description: "Fatores negativos ou pontos de melhoria" },
      analise_gancho: { type: "string" as const, description: "Analise da qualidade do gancho/hook" },
      analise_legenda: { type: "string" as const, description: "Analise da qualidade da legenda" },
      analise_formato: { type: "string" as const, description: "Analise da escolha de formato" },
      analise_hashtags: { type: "string" as const, description: "Analise do uso de hashtags" },
      analise_audio: { type: "string" as const, description: "Analise do audio/fala do video baseada na transcricao. Se nao ha transcricao fornecida, retorne 'N/A'" },
      rubrica: {
        type: "object" as const,
        properties: {
          gancho: { type: "number" as const, minimum: 1, maximum: 5 },
          legenda: { type: "number" as const, minimum: 1, maximum: 5 },
          formato: { type: "number" as const, minimum: 1, maximum: 5 },
          engajamento: { type: "number" as const, minimum: 1, maximum: 5 },
          estrategia: { type: "number" as const, minimum: 1, maximum: 5 },
        },
        required: ["gancho", "legenda", "formato", "engajamento", "estrategia"],
      },
      nota_geral: { type: "number" as const, description: "Nota geral do post de 0 a 10" },
      recomendacoes: { type: "array" as const, items: { type: "string" as const }, description: "3-5 recomendacoes acionaveis" },
      classificacao: { type: "string" as const, enum: ["gold", "silver", "bronze"] },
    },
    required: ["resumo_desempenho", "fatores_positivos", "fatores_negativos", "analise_gancho", "analise_legenda", "analise_formato", "analise_hashtags", "analise_audio", "rubrica", "nota_geral", "recomendacoes", "classificacao"],
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: postSystemPrompt },
          { role: "user", content: userMessage },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_posts",
              description: "Retorna a analise estruturada dos posts top e worst do Instagram",
              parameters: {
                type: "object",
                properties: {
                  top_post_analysis: postAnalysisSchema,
                  worst_post_analysis: postAnalysisSchema,
                },
                required: ["top_post_analysis", "worst_post_analysis"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_posts" } },
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("OpenAI Posts API error:", res.status, errorText);
      return null;
    }

    const data = await res.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("OpenAI Posts: no tool call in response");
      return null;
    }

    return JSON.parse(toolCall.function.arguments) as AIPostsResult;
  } catch (err) {
    console.error("analyzePostsWithAI error:", (err as Error).message);
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
  supabaseAdmin: ReturnType<typeof createClient>,
) {
  const templateBio = NICHO_BIOS[nichoKey] || NICHO_BIOS["default"];

  // Find top and worst posts
  let topIdx = 0;
  let worstIdx = 0;
  for (let i = 1; i < posts.length; i++) {
    if (posts[i].metrics.engagement_score > posts[topIdx].metrics.engagement_score) topIdx = i;
    if (posts[i].metrics.engagement_score < posts[worstIdx].metrics.engagement_score) worstIdx = i;
  }

  // Phase 1: Transcribe video audio for top/worst posts (parallel)
  const [topTranscript, worstTranscript] = await Promise.all([
    posts[topIdx].post_type === "Video"
      ? transcribeVideo(posts[topIdx].video_url, posts[topIdx].uses_original_audio, posts[topIdx].music_info)
      : Promise.resolve({ text: null, skipped_reason: null }),
    posts[worstIdx].post_type === "Video"
      ? transcribeVideo(posts[worstIdx].video_url, posts[worstIdx].uses_original_audio, posts[worstIdx].music_info)
      : Promise.resolve({ text: null, skipped_reason: null }),
  ]);

  // Phase 2: Run BOTH AI analyses in parallel (posts AI now includes transcription)
  const captions = posts.map(p => p.caption_preview).filter(Boolean).slice(0, 5);
  const [aiResult, postsAiResult] = await Promise.all([
    analyzeBioWithAI(profile, nicho, objetivo, captions),
    analyzePostsWithAI(profile, posts[topIdx], posts[worstIdx], posts, nicho, objetivo, topTranscript.text, worstTranscript.text),
  ]);

  // Calculate scores from rubric
  const sumRubric = (r: AIBioRubric) => r.clareza + r.autoridade + r.forca_cta + r.seo_descoberta + r.voz_da_marca + r.especificidade;

  const bio_suggestion = aiResult
    ? {
        current_bio: profile.bio_text,
        suggested_bio: aiResult.bio_sugerida,
        rationale_short: aiResult.justificativa_bio,
        cta_option: aiResult.cta_sugerido,
        score: parseFloat(((sumRubric(aiResult.rubrica_bio_atual) / 30) * 10).toFixed(1)),
        score_new: parseFloat(((sumRubric(aiResult.rubrica_bio_nova) / 30) * 10).toFixed(1)),
        criteria: {
          clarity: aiResult.rubrica_bio_atual.clareza,
          authority: aiResult.rubrica_bio_atual.autoridade,
          cta: aiResult.rubrica_bio_atual.forca_cta,
          seo: aiResult.rubrica_bio_atual.seo_descoberta,
          brand_voice: aiResult.rubrica_bio_atual.voz_da_marca,
          specificity: aiResult.rubrica_bio_atual.especificidade,
        },
        criteria_new: {
          clarity: aiResult.rubrica_bio_nova.clareza,
          authority: aiResult.rubrica_bio_nova.autoridade,
          cta: aiResult.rubrica_bio_nova.forca_cta,
          seo: aiResult.rubrica_bio_nova.seo_descoberta,
          brand_voice: aiResult.rubrica_bio_nova.voz_da_marca,
          specificity: aiResult.rubrica_bio_nova.especificidade,
        },
        diagnostic: aiResult.analise_diagnostica,
        strengths: aiResult.pontos_fortes,
        improvements: aiResult.pontos_de_melhoria,
        name_keyword: aiResult.sugestao_keyword_nome,
        detected_tone: aiResult.analise_diagnostica.tom_de_voz,
        variations: aiResult.bio_variacao_autoridade ? [
          { label: "Autoridade", bio: aiResult.bio_variacao_autoridade, rationale: "Foco em credenciais e prova social" },
          { label: "Conexão", bio: aiResult.bio_variacao_conexao, rationale: "Foco em personalidade e identificação" },
          { label: "Ação", bio: aiResult.bio_variacao_acao, rationale: "Foco em proposta de valor e CTA direto" },
        ] : undefined,
      }
    : {
        current_bio: profile.bio_text,
        suggested_bio: templateBio.suggested,
        rationale_short: templateBio.rationale,
        cta_option: templateBio.cta,
      };

  // Attach AI post analysis + transcription to top/worst posts
  const topPostData = {
    ...posts[topIdx],
    analysis: postsAiResult?.top_post_analysis || null,
    transcription: topTranscript.text || null,
    transcription_skipped: topTranscript.skipped_reason || null,
  };
  const worstPostData = {
    ...posts[worstIdx],
    analysis: postsAiResult?.worst_post_analysis || null,
    transcription: worstTranscript.text || null,
    transcription_skipped: worstTranscript.skipped_reason || null,
  };

  // Proxy thumbnails for top and worst posts (parallel)
  const [topThumb, worstThumb] = await Promise.all([
    proxyPostThumbnail(profile.handle, topPostData.post_id, topPostData.thumb_url, supabaseAdmin),
    proxyPostThumbnail(profile.handle, worstPostData.post_id, worstPostData.thumb_url, supabaseAdmin),
  ]);
  topPostData.thumb_url = topThumb;
  worstPostData.thumb_url = worstThumb;

  return {
    profile,
    deliverables: {
      bio_suggestion,
      top_post: topPostData || null,
      worst_post: worstPostData || null,
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
  supabaseAdmin: ReturnType<typeof createClient>,
) {
  // Premium also gets AI bio analysis
  return buildFreeResult(profile, posts, nichoKey, nicho, objetivo, supabaseAdmin).then((freeResult) => ({
    ...freeResult,
    deliverables: {
      ...freeResult.deliverables,
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
  supabaseAdmin: any;
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
    const posts = normalizePosts(rawProfile.latestPosts || [], profile.followers);
    const nichoKey = Object.keys(NICHO_BIOS).includes(nicho!) ? nicho! : "default";

    // ── [5] If NOT authenticated → return pending_result ─────
    if (!userId) {
      const pendingResult = await buildFreeResult(profile, posts, nichoKey, nicho!, objetivo!, supabaseAdmin);
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
      ? await buildPremiumResult(profile, posts, nichoKey, nicho!, objetivo!, supabaseAdmin)
      : await buildFreeResult(profile, posts, nichoKey, nicho!, objetivo!, supabaseAdmin);

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
