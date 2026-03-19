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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s total

    const videoRes = await fetch(videoUrl, { signal: controller.signal });
    if (!videoRes.ok) { clearTimeout(timeout); throw new Error(`fetch video ${videoRes.status}`); }

    const blob = await videoRes.blob();
    if (blob.size > 25 * 1024 * 1024) {
      clearTimeout(timeout);
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
      signal: controller.signal,
    });

    clearTimeout(timeout);

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
                },
                required: ["analise_diagnostica", "rubrica_bio_atual", "nota_geral", "pontos_fortes", "pontos_de_melhoria", "sugestao_keyword_nome", "bio_sugerida", "rubrica_bio_nova", "justificativa_bio", "cta_sugerido"],
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
    // Validate and sanitize bio variations per objective (same rules as main bio)
    const bioObjetivoMap = { crescer: "crescer", engajar: "engajar", vender: "vender", autoridade: "autoridade" } as const;
    for (const obj of Object.keys(bioObjetivoMap)) {
      const key = `bio_para_${obj}` as keyof typeof parsed;
      if (parsed[key]) {
        // deno-lint-ignore no-explicit-any
        (parsed as unknown as Record<string, string>)[key] = validateBioHallucinations(parsed[key] as string, profile.bio_text, captions);
        // deno-lint-ignore no-explicit-any
        (parsed as unknown as Record<string, string>)[key] = validateBioTextClaims(parsed[key] as string, profile.bio_text, captions);
        // deno-lint-ignore no-explicit-any
        (parsed as unknown as Record<string, string>)[key] = enforceBioQuality(parsed[key] as string, obj);
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

// ── Weekly Content Plan ──────────────────────────────────────

interface AIScriptScene {
  numero: number;
  titulo_cena: string;
  instrucao: string;
  duracao_estimada: string;
}

interface AIContentScript {
  dia: number;
  dia_semana: string;
  titulo: string;
  tema: string;
  framework: string;
  formato: string;
  hook: string;
  cenas: AIScriptScene[];
  cta: string;
  legenda_sugerida: string;
  hashtags_sugeridas: string[];
  score_interno: number;
}

interface AIWeeklyContentResult {
  estrategia_semanal: string;
  roteiros: AIContentScript[];
}

const weeklyContentSystemPrompt = `Voce e uma especialista senior em estrategia de conteudo para Instagram, roteirista de videos virais e planejadora editorial para criadores brasileiros.

<missao>
Crie 7 roteiros de video (1 por dia, Segunda a Domingo) personalizados para o perfil analisado. Cada roteiro deve seguir uma estrutura viral comprovada e ser imediatamente gravavel pelo criador. Toda resposta DEVE ser enviada exclusivamente via tool call.
</missao>

<contexto_viral>
DADOS CRUCIAIS DE PERFORMANCE EM 2025-2026:
- 71% dos espectadores decidem nos primeiros 3 segundos (Hook e OBRIGATORIO)
- Videos de 15-30s tem taxas de conclusao 2x maiores que videos longos
- Conteudo autenticidade/lo-fi performa 60% melhor que super produzido
- Algoritmo prioriza Salvamentos e Compartilhamentos acima de Likes
- Variedade de formatos na semana maximiza alcance algoritmico
- Cada dia DEVE usar um framework/angulo DIFERENTE para manter variedade

FRAMEWORKS DISPONÍVEIS (use TODOS ao longo da semana, sem repetir):
1. Hook-Value-CTA: Gancho (3s) → Valor (15-30s) → CTA (3-5s) — padrao para Reels educativos
2. PAS (Problem-Agitate-Solution): Apresente problema → Agite a dor → Entregue solucao — para conteudo de transformacao
3. BAB (Before-After-Bridge): Mostre o antes → Mostre o depois → Revele o caminho — para resultados/testimoniais
4. AIDA (Attention-Interest-Desire-Action): Capte atencao → Gere interesse → Crie desejo → Direcione acao — para vendas/servicos
5. Storytelling: Historia pessoal/caso real → Licao → CTA — para conexao e autoridade
6. Mito vs Realidade: Derrube crenca comum → Mostre a verdade → CTA — para educacao
7. Lista/Ranking: "X coisas que..." → Itens com valor → CTA — para salvamentos
</contexto_viral>

<regras_roteiro>
1. CADA roteiro deve ter: hook (0-3s), 3-5 cenas DETALHADAS, CTA final
2. Os 7 dias DEVEM cobrir angulos diferentes: educativo, entretenimento, autoridade, bastidores, transformacao, comunidade, venda soft
3. Pelo menos 5 roteiros devem ser formato Reel e pelo menos 1 carrossel
4. Hooks devem ser provocativos, criar curiosidade ou identificacao IMEDIATA
5. CTAs devem variar: "comente X", "salve para depois", "envie para alguem", "link na bio"
6. Legendas sugeridas devem ter storytelling, valor e CTA escrito
7. Hashtags: 5-10 por post, mix de nicho especifico + descoberta
8. NUNCA invente dados, numeros ou cases que nao existam no perfil
9. Tom deve ser compativel com o perfil analisado
10. Cada roteiro deve ser autoavaliado com score_interno de 1-10

REGRA CRITICA — FORMATO DAS CENAS:
Cada cena DEVE ser um ROTEIRO DETALHADO pronto para gravar, NAO uma instrucao vaga.

ERRADO (vago demais):
- "Mostre o erro comum na execucao"
- "Explique o impacto nos resultados"
- "Apresente o problema"

CORRETO (roteiro gravavel):
- 'Cena 1 - Inicio Impactante\nVoce (com expressao de surpresa): "Serio que voce ainda faz isso? Para agora e me ouve..."\n(Pausa dramatica, olha fixo pra camera)'
- 'Cena 2 - Quebra de Objecao\nVoce: "Eu sei o que voce ta pensando: mas fulano faz assim e da certo. So que olha o que acontece quando..."\n(Corte rapido: mostre exemplo na tela)\nTexto na tela: "O que ninguem te conta"'
- 'Cena 3 - Prova e Solucao\nVoce (sorrindo, confiante): "Agora faz assim: pega seu celular, abre o app e..."\n(Mostre a tela do celular com o passo a passo)'

Cada instrucao de cena deve conter:
- titulo_cena: nome curto da cena (ex: "Inicio Impactante", "Quebra de Objecao", "Prova Social", "Convite Direto")
- DIALOGOS LITERAIS prontos pra falar — entre aspas, como um script de cinema
- EXPRESSOES E ACOES entre parenteses: (com cara de surpresa), (apontando para camera), (sorrindo)
- INDICACOES DE PRODUCAO quando aplicavel: "Corte rapido para...", "Texto na tela: ...", "B-roll de..."
- A pessoa deve poder GRAVAR imediatamente lendo o roteiro, sem precisar pensar no que dizer

DISTRIBUICAO SEMANAL RECOMENDADA:
- Segunda: Conteudo educativo (autoridade)
- Terca: Bastidores/dia-a-dia (conexao)
- Quarta: Mito vs Realidade ou Lista (salvamentos)
- Quinta: Storytelling/case (emocao)
- Sexta: Conteudo leve/entretenimento (alcance)
- Sabado: Transformacao/resultado (prova social)
- Domingo: CTA soft/comunidade (engajamento)
</regras_roteiro>

<auto_avaliacao>
Antes de retornar cada roteiro, avalie internamente:
- Hook: Prende em 3 segundos? (0-2 pontos)
- Instrucoes: Sao claras e gravaveis? (0-2 pontos)
- Alinhamento: Serve o objetivo do perfil? (0-2 pontos)
- Potencial viral: Gera saves/shares? (0-2 pontos)
- Originalidade: Nao e generico? (0-2 pontos)
Se score_interno < 8, REFACA o roteiro internamente antes de retornar.
</auto_avaliacao>`;

const roteiroItemSchema = {
  type: "object" as const,
  properties: {
    dia: { type: "number" as const },
    dia_semana: { type: "string" as const, enum: ["Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado", "Domingo"] },
    titulo: { type: "string" as const, description: "Titulo curto do roteiro (max 60 chars)" },
    tema: { type: "string" as const, description: "Angulo estrategico deste conteudo" },
    framework: { type: "string" as const, enum: ["Hook-Value-CTA", "PAS", "BAB", "AIDA", "Storytelling", "Mito vs Realidade", "Lista/Ranking"] },
    formato: { type: "string" as const, enum: ["reel", "carrossel"] },
    hook: { type: "string" as const, description: "Frase de abertura que prende em 3 segundos" },
    cenas: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          numero: { type: "number" as const },
          titulo_cena: { type: "string" as const, description: "Nome curto da cena" },
          instrucao: { type: "string" as const, description: "Roteiro DETALHADO com dialogos literais entre aspas" },
          duracao_estimada: { type: "string" as const },
        },
        required: ["numero", "titulo_cena", "instrucao", "duracao_estimada"],
      },
    },
    cta: { type: "string" as const, description: "Call-to-action final" },
    legenda_sugerida: { type: "string" as const, description: "Legenda completa sugerida com storytelling e CTA" },
    hashtags_sugeridas: {
      type: "array" as const,
      items: { type: "string" as const },
    },
    score_interno: { type: "number" as const, description: "Auto-avaliacao interna 1-10" },
  },
  required: ["dia", "dia_semana", "titulo", "tema", "framework", "formato", "hook", "cenas", "cta", "legenda_sugerida", "hashtags_sugeridas", "score_interno"],
};

const weeklyContentSchema = {
  type: "object" as const,
  properties: {
    estrategia_semanal: {
      type: "string" as const,
      description: "Visao geral da estrategia em 1-2 frases",
    },
    roteiros: { type: "array" as const, items: roteiroItemSchema },
  },
  required: ["estrategia_semanal", "roteiros"],
};

async function generateWeeklyContent(
  profile: ReturnType<typeof normalizeProfile>,
  nicho: string,
  objetivo: string,
  captions: string[],
  topPostInsights: string,
  worstPostInsights: string,
): Promise<AIWeeklyContentResult | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    console.warn("generateWeeklyContent: OPENAI_API_KEY not set, skipping");
    return null;
  }
  console.log(`generateWeeklyContent: starting for @${profile.handle}, nicho=${nicho}`);

  const legendas = captions.length > 0
    ? captions.map(c => `- "${c.slice(0, 300)}"`).join("\n")
    : "(sem legendas disponiveis)";

  const userMessage = `Crie 7 roteiros de video (1 por dia, 7 dias) para @${profile.handle}.

Gere 1 roteiro para CADA dia da semana (Segunda a Domingo = 7 roteiros total).
Cada dia deve usar um framework/angulo DIFERENTE.
dia=1 (Segunda), dia=2 (Terca), ..., dia=7 (Domingo).

PERFIL:
- Nicho: ${nicho}
- Objetivo principal do usuario: ${objetivo.toUpperCase()}
- Bio: "${profile.bio_text}"
- Seguidores: ${profile.followers}

INSIGHTS DA ANALISE (o que funciona no perfil):
${topPostInsights}

INSIGHTS DA ANALISE (o que NAO funciona):
${worstPostInsights}

LEGENDAS RECENTES (referencia de tom e temas):
${legendas}

Gere 7 roteiros usando frameworks DIFERENTES, variando entre educativo, entretenimento, autoridade, bastidores, transformacao, comunidade e venda soft. Auto-avaliacao interna (score_interno 1-10). Se algum ficar abaixo de 8, refaca antes de retornar.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

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
          { role: "system", content: weeklyContentSystemPrompt },
          { role: "user", content: userMessage },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_weekly_content",
              description: "Retorna 7 roteiros de video (1 por dia, 7 dias) para 1 semana de conteudo",
              parameters: weeklyContentSchema,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_weekly_content" } },
      }),
    });

    if (!res.ok) {
      console.error("OpenAI Weekly Content error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("OpenAI Weekly: no tool call. Response:", JSON.stringify(data?.choices?.[0]?.message || {}).slice(0, 500));
      return null;
    }

    const parsed = JSON.parse(toolCall.function.arguments) as AIWeeklyContentResult;
    console.log(`generateWeeklyContent: success, ${parsed.roteiros?.length || 0} scripts generated`);
    return parsed;
  } catch (err) {
    console.error("generateWeeklyContent error:", (err as Error).message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function cleanRoteiros(roteiros: AIContentScript[]) {
  return roteiros.map((r) => ({
    dia: r.dia,
    dia_semana: r.dia_semana,
    titulo: r.titulo,
    tema: r.tema,
    framework: r.framework,
    formato: r.formato,
    hook: r.hook,
    cenas: r.cenas,
    cta: r.cta,
    legenda_sugerida: r.legenda_sugerida,
    hashtags_sugeridas: (r.hashtags_sugeridas || [])
      .filter((h): h is string => typeof h === "string" && h.length > 0)
      .map((h) => h.startsWith("#") ? h : `#${h}`),
  }));
}

function applyWeeklyQualityGate(
  result: AIWeeklyContentResult,
): { scripts: ReturnType<typeof cleanRoteiros>; estrategia_semanal: string } {
  return {
    scripts: result.roteiros ? cleanRoteiros(result.roteiros) : [],
    estrategia_semanal: result.estrategia_semanal,
  };
}

// ── Stories generation ────────────────────────────────────────

interface AIStorySlide {
  numero: number;
  tipo: "texto" | "enquete" | "quiz" | "caixa_perguntas" | "video_selfie" | "foto" | "countdown" | "link";
  conteudo: string;
  instrucao_visual?: string;
}

interface AIStorySequence {
  dia: number;
  tema: string;
  objetivo: string;
  slides: AIStorySlide[];
}

interface AIStoriesResult {
  estrategia_stories: string;
  sequences: AIStorySequence[];
}

const storiesSystemPrompt = `Voce e uma copywriter e estrategista de Stories para Instagram de elite. Seu trabalho e criar sequencias de Stories que PRENDEM, ENGAJAM e CONVERTEM — usando tecnicas avancadas de persuasao, storytelling e psicologia comportamental. Voce domina frameworks como PAS (Problem-Agitation-Solution), AIDA, open loops e micro-commitments. Toda resposta DEVE ser enviada exclusivamente via tool call.

<missao>
Crie as sequencias de Stories (1 por dia) personalizadas para o perfil analisado. Gere EXATAMENTE a quantidade de dias solicitada pelo usuario. Cada sequencia DEVE seguir um arco narrativo com TENSAO, CURIOSIDADE e RESOLUCAO. Nada de stories "bobos" ou genericos — cada slide deve ter intencao estrategica clara.
</missao>

<frameworks_obrigatorios>
TODA sequencia deve usar pelo menos 1 destes frameworks:

1. PAS (Problem-Agitation-Solution):
   - Slide 1: Identifique uma DOR ESPECIFICA da audiencia (nao generico)
   - Slide 2: AGITE a dor — mostre consequencias, custos, frustracao
   - Slide 3+: Apresente a solucao com prova ou acao pratica

2. OPEN LOOP (Curiosidade):
   - Slide 1: Crie uma PROMESSA ou REVELACAO incompleta ("Descobri algo que mudou tudo...")
   - Slides intermediarios: Construa a tensao sem entregar a resposta
   - Slide final: Feche o loop com a entrega + CTA

3. MICRO-COMMITMENTS (Escada de engajamento):
   - Comece com uma interacao FACIL (enquete simples)
   - Escale para interacao MEDIA (quiz que educa)
   - Termine com interacao ALTA (caixa de perguntas ou CTA direto)

4. CONTRARIAN/PROVOCACAO:
   - Desafie uma crenca comum do nicho
   - Apresente evidencia ou perspectiva alternativa
   - Gere debate e polarizacao saudavel
</frameworks_obrigatorios>

<copy_rules>
REGRAS DE COPY PARA CADA SLIDE:

SLIDE 1 (HOOK — 80% do poder de retencao):
- Maximo 10 palavras no texto principal
- DEVE provocar curiosidade, choque ou identificacao imediata
- Exemplos de patterns que funcionam:
  * "Voce esta fazendo [X] errado e nem sabe"
  * "Eu gastei [tempo/dinheiro] pra aprender isso..."
  * "Todo mundo fala pra [fazer X]. Eu discordo."
  * "3 segundos pra descobrir se voce [faz algo certo]"
  * "O que ninguem te conta sobre [tema do nicho]"
- NUNCA comece com "Oi gente", "Bom dia", "Hoje eu quero falar sobre..."

ENQUETES (nao binarias — provoque reflexao):
- ERRADO: "Voce gosta de [X]? Sim / Nao"
- CERTO: "Qual dessas situacoes te trava mais? [Opcao especifica A] / [Opcao especifica B]"
- CERTO: "Se voce pudesse resolver SÓ UMA coisa no seu [area], seria: [A] ou [B]?"
- Use enquetes que REVELAM algo sobre a audiencia e criam identificacao
- A enquete deve fazer a pessoa PENSAR, nao apenas clicar

QUIZ (educar surpreendendo):
- A resposta certa deve SURPREENDER (ir contra o senso comum)
- Use dados reais ou insights do nicho
- Apos o quiz, o proximo slide EXPLICA por que — isso prende
- ERRADO: "Qual rede social tem mais usuarios?" (irrelevante)
- CERTO: "Quantos % dos seus seguidores veem seus Stories? A) 50% B) 15% C) 3% (V)" → proximo slide explica como aumentar

CAIXA DE PERGUNTAS (nao generico):
- ERRADO: "Me pergunte algo"
- CERTO: "Qual a MAIOR dificuldade que voce tem com [tema especifico do nicho]?"
- CERTO: "Se eu pudesse resolver UM problema seu com [area], qual seria?"
- A caixa deve parecer uma CONSULTA, nao um Q&A generico

VIDEO SELFIE (conexao + autoridade):
- SEMPRE inclua a FALA LITERAL (script completo, nao apenas descricao)
- Tom: como se falasse com UM amigo proximo, nao com uma plateia
- Comece com gancho verbal forte nos primeiros 2 segundos
- ERRADO: "Oi gente, hoje vou falar sobre..." → PROIBIDO
- CERTO: "Sabe aquele erro que eu cometia todo dia? Deixa eu te mostrar..."
- Maximo 30 segundos de fala por slide

COUNTDOWN:
- Conecte a um evento REAL ou deadline do nicho
- Crie ANTECIPACAO com contexto: por que a pessoa deveria se importar?

LINK:
- O texto deve criar NECESSIDADE antes de apresentar o link
- Padrao: [Problema] → [Solucao no link] → "Acessa que muda tudo"
</copy_rules>

<estrutura_mensal>
Siga a distribuicao de categorias indicada na mensagem do usuario.
VARIACAO OBRIGATORIA: nunca repita o mesmo tipo de framework em 2 dias consecutivos.
</estrutura_mensal>

<contexto_stories>
DADOS DE PERFORMANCE 2025-2026:
- Sequencias estruturadas geram 35% mais engajamento que stories avulsos
- Interatividade (enquete/quiz) aumenta alcance do proximo story em 40%
- Video selfie tem 60% mais retencao que stories estaticos
- 3-5 slides e o ponto ideal (nao cansar, nao perder)
- Enquetes com opcoes ESPECIFICAS tem 3x mais respostas que Sim/Nao genericas
- Open loops aumentam completion rate em 28%
- Slide 6 e o ponto critico de fadiga — SEMPRE coloque elemento interativo antes

TIPOS DE SLIDE DISPONIVEIS:
1. texto: Texto sobre fundo colorido ou imagem — para hooks, provocacoes, revelacoes
2. enquete: Enquete com 2 opcoes — para micro-commitments e segmentacao de audiencia
3. quiz: Quiz com opcoes — para educar surpreendendo (resposta contra-intuitiva)
4. caixa_perguntas: Caixa "Me pergunte" — para pesquisa de audiencia disfarçada de engajamento
5. video_selfie: Video de rosto com SCRIPT COMPLETO — para conexao e autoridade
6. foto: Foto com texto overlay — para bastidores, resultados, antes/depois
7. countdown: Countdown para evento/lancamento — para criar antecipacao com contexto
8. link: Story com link (sticker) — para direcionar trafego apos criar necessidade
</contexto_stories>

<regras>
1. CADA sequencia deve ter 3-5 slides, usando pelo menos 2 tipos diferentes de slide
2. Slide 1 SEMPRE deve ser um HOOK que prende em 2 segundos (video_selfie provocativo OU texto impactante)
3. SEMPRE inclua pelo menos 1 slide interativo (enquete, quiz ou caixa_perguntas) por sequencia
4. NUNCA comece com "Oi gente", "Bom dia", saudacoes ou introducoes genericas
5. Varie os temas — NUNCA repita o mesmo framework em dias consecutivos
6. Tom CONVERSACIONAL — como mensagem de WhatsApp para amigo, nao palestra
7. instrucao_visual e OBRIGATORIA para slides de foto e video_selfie
8. conteudo para enquete: inclua opcoes ESPECIFICAS (ex: "O que te trava mais? | Medo de se expor | Nao saber o que postar")
9. conteudo para quiz: pergunta + opcoes + resposta certa com (V) + a resposta deve SURPREENDER
10. conteudo para video_selfie: inclua o SCRIPT LITERAL completo (fala palavra por palavra)
11. NUNCA invente dados ou numeros do perfil
12. Cada sequencia deve ter um ARCO NARRATIVO claro (inicio-meio-fim), nao slides soltos
</regras>`;

const storySequenceItemSchema = {
  type: "object" as const,
  properties: {
    dia: { type: "number" as const },
    tema: { type: "string" as const, description: "Tema do dia (max 40 chars)" },
    objetivo: { type: "string" as const, description: "Objetivo do story: engajamento, autoridade, vendas, conexao, etc." },
    slides: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          numero: { type: "number" as const },
          tipo: { type: "string" as const, enum: ["texto", "enquete", "quiz", "caixa_perguntas", "video_selfie", "foto", "countdown", "link"] },
          conteudo: { type: "string" as const, description: "Texto/script do slide. Para enquete: inclua opcoes. Para quiz: inclua pergunta + opcoes + (V) na correta. Para video: inclua fala literal." },
          instrucao_visual: { type: "string" as const, description: "Instrucao de producao: fundo, filtro, posicao de texto, etc." },
        },
        required: ["numero", "tipo", "conteudo"],
      },
    },
  },
  required: ["dia", "tema", "objetivo", "slides"],
};

const storiesSchema = {
  type: "object" as const,
  properties: {
    estrategia_stories: {
      type: "string" as const,
      description: "Visao geral da estrategia de Stories em 1-2 frases",
    },
    sequences: { type: "array" as const, items: storySequenceItemSchema },
  },
  required: ["estrategia_stories", "sequences"],
};

async function generateStoriesBatch(
  profile: ReturnType<typeof normalizeProfile>,
  nicho: string,
  objetivo: string,
  captions: string[],
  topPostInsights: string,
  diaStart: number,
  diaEnd: number,
  distribuicao: string,
): Promise<AIStoriesResult | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return null;

  const count = diaEnd - diaStart + 1;
  const legendas = captions.length > 0
    ? captions.map(c => `- "${c.slice(0, 200)}"`).join("\n")
    : "(sem legendas disponiveis)";

  const userMessage = `Crie ${count} sequencias de Stories PERSUASIVAS e ESTRATEGICAS para @${profile.handle}.

Gere ${count} sequencias (dia ${diaStart} a dia ${diaEnd}).

PERFIL:
- Nicho: ${nicho}
- Objetivo principal do usuario: ${objetivo.toUpperCase()}
- Bio: "${profile.bio_text}"
- Seguidores: ${profile.followers}

INSIGHTS DO PERFIL (o que ja funciona — REPLIQUE nos Stories):
${topPostInsights}

LEGENDAS RECENTES (referencia de tom e linguagem — MANTENHA o estilo):
${legendas}

INSTRUCOES CRITICAS:
1. Cada sequencia DEVE seguir um framework (PAS, open loop, micro-commitment ou contrarian)
2. Slide 1 de CADA sequencia deve ser um HOOK irresistivel — SEM saudacoes, SEM introducoes
3. Enquetes devem ter opcoes ESPECIFICAS do nicho (nao "Sim/Nao" generico)
4. Quizzes devem ter resposta que SURPREENDE e educa
5. Video selfie deve ter SCRIPT LITERAL completo (nao apenas descricao)
6. Use a linguagem e tom das legendas recentes — mantenha a voz do criador
7. Cada sequencia deve contar uma MICRO-HISTORIA com inicio, meio e fim
8. Distribua neste lote: ${distribuicao}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

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
        max_completion_tokens: 16384,
        messages: [
          { role: "system", content: storiesSystemPrompt },
          { role: "user", content: userMessage },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_stories",
              description: `Retorna ${count} sequencias de Stories (dia ${diaStart}-${diaEnd})`,
              parameters: storiesSchema,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_stories" } },
      }),
    });

    if (!res.ok) {
      console.error("OpenAI Stories batch error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("OpenAI Stories batch: no tool call. Response:", JSON.stringify(data?.choices?.[0]?.message || {}).slice(0, 500));
      return null;
    }

    const parsed = JSON.parse(toolCall.function.arguments) as AIStoriesResult;
    console.log(`generateStoriesBatch(${diaStart}-${diaEnd}): success, ${parsed.sequences?.length || 0} sequences`);
    return parsed;
  } catch (err) {
    console.error(`generateStoriesBatch(${diaStart}-${diaEnd}) error:`, (err as Error).message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function generateStories(
  profile: ReturnType<typeof normalizeProfile>,
  nicho: string,
  objetivo: string,
  captions: string[],
  topPostInsights: string,
): Promise<AIStoriesResult | null> {
  console.log(`generateStories: starting for @${profile.handle}, nicho=${nicho}`);

  // Split into 2 parallel batches to stay within token limits
  const [batch1, batch2] = await Promise.all([
    generateStoriesBatch(profile, nicho, objetivo, captions, topPostInsights,
      1, 15, "4 educacao, 3 bastidores, 3 comunidade, 2 prova social, 2 storytelling, 1 venda soft"),
    generateStoriesBatch(profile, nicho, objetivo, captions, topPostInsights,
      16, 30, "4 educacao, 3 bastidores, 2 comunidade, 2 prova social, 2 storytelling, 2 venda soft"),
  ]);

  if (!batch1 && !batch2) return null;

  const allSequences = [
    ...(batch1?.sequences || []),
    ...(batch2?.sequences || []),
  ];

  console.log(`generateStories: total ${allSequences.length} sequences from 2 batches`);

  return {
    estrategia_stories: batch1?.estrategia_stories || batch2?.estrategia_stories || "",
    sequences: allSequences,
  };
}

function cleanSequences(sequences: AIStorySequence[]) {
  return sequences.map((s) => ({
    dia: s.dia,
    tema: s.tema,
    objetivo: s.objetivo,
    slides: s.slides,
  }));
}

function applyStoriesQualityGate(result: AIStoriesResult): {
  sequences: ReturnType<typeof cleanSequences>;
  estrategia_stories: string;
} {
  return {
    sequences: result.sequences ? cleanSequences(result.sequences) : [],
    estrategia_stories: result.estrategia_stories,
  };
}

// ── Enrichment generation ────────────────────────────────────

interface EnrichmentResult {
  hashtag_strategy: { high_competition: string[]; medium_competition: string[]; low_competition: string[]; usage_tip: string };
}

async function generateEnrichment(
  profile: ReturnType<typeof normalizeProfile>,
  nicho: string,
  objetivo: string,
): Promise<EnrichmentResult | null> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) return null;

  const systemPrompt = `Voce e um estrategista de Instagram especializado em crescimento organico.
Analise o perfil e gere uma ESTRATEGIA DE HASHTAGS personalizada:
- 5 hashtags de alta competicao (hashtags populares do nicho)
- 10 hashtags de media competicao (nicho especifico)
- 15 hashtags de baixa competicao (cauda longa, micro-nicho)
- 1 dica pratica de como usar as hashtags

Responda em portugues. Baseie-se no nicho e objetivo do perfil.`;

  const userPrompt = `Perfil: @${profile.handle}
Nicho: ${nicho}
Objetivo: ${objetivo}
Seguidores: ${profile.followers}
Posts: ${profile.posts_count}
Bio: ${profile.bio_text}`;

  const schema = {
    type: "object" as const,
    properties: {
      hashtag_strategy: {
        type: "object" as const,
        properties: {
          high_competition: { type: "array" as const, items: { type: "string" as const } },
          medium_competition: { type: "array" as const, items: { type: "string" as const } },
          low_competition: { type: "array" as const, items: { type: "string" as const } },
          usage_tip: { type: "string" as const },
        },
        required: ["high_competition", "medium_competition", "low_competition", "usage_tip"],
      },
    },
    required: ["hashtag_strategy"],
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{ type: "function", function: { name: "enrichment_result", parameters: schema } }],
        tool_choice: { type: "function", function: { name: "enrichment_result" } },
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      console.error(`generateEnrichment: OpenAI error ${resp.status}`);
      return null;
    }

    const data = await resp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return null;

    const parsed = JSON.parse(toolCall.function.arguments) as EnrichmentResult;

    // Normalize hashtags
    const normalizeTag = (t: string) => {
      let tag = t.trim();
      if (!tag.startsWith("#")) tag = "#" + tag;
      return tag.toLowerCase().replace(/\s+/g, "");
    };
    parsed.hashtag_strategy.high_competition = parsed.hashtag_strategy.high_competition.map(normalizeTag);
    parsed.hashtag_strategy.medium_competition = parsed.hashtag_strategy.medium_competition.map(normalizeTag);
    parsed.hashtag_strategy.low_competition = parsed.hashtag_strategy.low_competition.map(normalizeTag);

    console.log(`generateEnrichment: OK (${parsed.hashtag_strategy.high_competition.length + parsed.hashtag_strategy.medium_competition.length + parsed.hashtag_strategy.low_competition.length} hashtags)`);
    return parsed;
  } catch (err) {
    console.error("generateEnrichment crashed:", err);
    return null;
  }
}

// ── Result builders ──────────────────────────────────────────

async function buildFreeResult(
  profile: ReturnType<typeof normalizeProfile>,
  posts: ReturnType<typeof normalizePosts>,
  nichoKey: string,
  nicho: string,
  objetivo: string,
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
) {
  const templateBio = NICHO_BIOS[nichoKey] || NICHO_BIOS["default"];

  // Find top and worst posts
  let topIdx = 0;
  let worstIdx = 0;
  for (let i = 1; i < posts.length; i++) {
    if (posts[i].metrics.engagement_score > posts[topIdx].metrics.engagement_score) topIdx = i;
    if (posts[i].metrics.engagement_score < posts[worstIdx].metrics.engagement_score) worstIdx = i;
  }

  const captions = posts.map(p => p.caption_preview).filter(Boolean).slice(0, 5);

  // Build basic post insights (used by Phase 3 without waiting for AI analysis)
  const basicTopInsights = `Top post tem engagement score de ${posts[topIdx].metrics.engagement_score}. Formato: ${posts[topIdx].post_type}. Caption: "${posts[topIdx].caption_preview}".`;
  const basicWorstInsights = `Worst post tem engagement score de ${posts[worstIdx].metrics.engagement_score}. Formato: ${posts[worstIdx].post_type}.`;

  // ALL PHASES IN PARALLEL — no sequential dependencies
  // Bio AI doesn't need transcription, weekly/stories/hashtags use basic insights
  const [
    aiResult,
    postsAnalysisBundle,
    weeklyContentResult,
    storiesResult,
    enrichmentResult,
  ] = await Promise.all([
    // Bio analysis (independent — no transcription needed)
    analyzeBioWithAI(profile, nicho, objetivo, captions),
    // Posts analysis (transcription → post AI → proxy thumbnails, chained internally)
    (async () => {
      const [topTranscript, worstTranscript] = await Promise.all([
        posts[topIdx].post_type === "Video"
          ? transcribeVideo(posts[topIdx].video_url, posts[topIdx].uses_original_audio, posts[topIdx].music_info)
          : Promise.resolve({ text: null, skipped_reason: null }),
        posts[worstIdx].post_type === "Video"
          ? transcribeVideo(posts[worstIdx].video_url, posts[worstIdx].uses_original_audio, posts[worstIdx].music_info)
          : Promise.resolve({ text: null, skipped_reason: null }),
      ]);
      const postsAiResult = await analyzePostsWithAI(
        profile, posts[topIdx], posts[worstIdx], posts, nicho, objetivo,
        topTranscript.text, worstTranscript.text,
      );
      // Proxy thumbnails
      const topPostData = {
        ...posts[topIdx],
        analysis: postsAiResult?.top_post_analysis || null,
        tier: (postsAiResult?.top_post_analysis?.classificacao || posts[topIdx].tier) as "gold" | "silver" | "bronze",
        transcript: topTranscript.text || undefined,
        transcript_skipped_reason: topTranscript.skipped_reason || undefined,
      };
      const worstPostData = {
        ...posts[worstIdx],
        analysis: postsAiResult?.worst_post_analysis || null,
        tier: (postsAiResult?.worst_post_analysis?.classificacao || posts[worstIdx].tier) as "gold" | "silver" | "bronze",
        transcript: worstTranscript.text || undefined,
        transcript_skipped_reason: worstTranscript.skipped_reason || undefined,
      };
      const [topThumb, worstThumb] = await Promise.all([
        proxyPostThumbnail(profile.handle, topPostData.post_id, topPostData.thumb_url, supabaseAdmin)
          .catch(() => topPostData.thumb_url),
        proxyPostThumbnail(profile.handle, worstPostData.post_id, worstPostData.thumb_url, supabaseAdmin)
          .catch(() => worstPostData.thumb_url),
      ]);
      topPostData.thumb_url = topThumb;
      worstPostData.thumb_url = worstThumb;
      return { topPostData, worstPostData };
    })(),
    // Weekly content (starts immediately with basic insights)
    generateWeeklyContent(profile, nicho, objetivo, captions, basicTopInsights, basicWorstInsights)
      .catch((err) => { console.error("generateWeeklyContent crashed:", err); return null; }),
    // Stories (starts immediately with basic insights)
    generateStories(profile, nicho, objetivo, captions, basicTopInsights)
      .catch((err) => { console.error("generateStories crashed:", err); return null; }),
    // Hashtags (starts immediately)
    generateEnrichment(profile, nicho, objetivo)
      .catch((err) => { console.error("generateEnrichment crashed:", err); return null; }),
  ]);

  const { topPostData, worstPostData } = postsAnalysisBundle || {
    topPostData: { ...posts[topIdx], analysis: null, tier: posts[topIdx].tier },
    worstPostData: { ...posts[worstIdx], analysis: null, tier: posts[worstIdx].tier },
  };

  // Calculate scores from rubric (safe fallback if AI omits fields)
  const defaultRubric: AIBioRubric = { clareza: 1, autoridade: 1, forca_cta: 1, seo_descoberta: 1, voz_da_marca: 1, especificidade: 1 };
  const safeRubric = (r: AIBioRubric | undefined): AIBioRubric => r && typeof r.clareza === "number" ? r : defaultRubric;
  const sumRubric = (r: AIBioRubric) => r.clareza + r.autoridade + r.forca_cta + r.seo_descoberta + r.voz_da_marca + r.especificidade;

  const bio_suggestion = aiResult
    ? {
        current_bio: profile.bio_text,
        suggested_bio: aiResult.bio_sugerida,
        rationale_short: aiResult.justificativa_bio,
        cta_option: aiResult.cta_sugerido,
        score: parseFloat(((sumRubric(safeRubric(aiResult.rubrica_bio_atual)) / 30) * 10).toFixed(1)),
        score_new: parseFloat(((sumRubric(safeRubric(aiResult.rubrica_bio_nova)) / 30) * 10).toFixed(1)),
        criteria: {
          clarity: safeRubric(aiResult.rubrica_bio_atual).clareza,
          authority: safeRubric(aiResult.rubrica_bio_atual).autoridade,
          cta: safeRubric(aiResult.rubrica_bio_atual).forca_cta,
          seo: safeRubric(aiResult.rubrica_bio_atual).seo_descoberta,
          brand_voice: safeRubric(aiResult.rubrica_bio_atual).voz_da_marca,
          specificity: safeRubric(aiResult.rubrica_bio_atual).especificidade,
        },
        criteria_new: {
          clarity: safeRubric(aiResult.rubrica_bio_nova).clareza,
          authority: safeRubric(aiResult.rubrica_bio_nova).autoridade,
          cta: safeRubric(aiResult.rubrica_bio_nova).forca_cta,
          seo: safeRubric(aiResult.rubrica_bio_nova).seo_descoberta,
          brand_voice: safeRubric(aiResult.rubrica_bio_nova).voz_da_marca,
          specificity: safeRubric(aiResult.rubrica_bio_nova).especificidade,
        },
        diagnostic: aiResult.analise_diagnostica || {},
        strengths: aiResult.pontos_fortes,
        improvements: aiResult.pontos_de_melhoria,
        name_keyword: aiResult.sugestao_keyword_nome,
        detected_tone: aiResult.analise_diagnostica?.tom_de_voz,
        variations: aiResult.bio_variacao_autoridade ? [
          { label: "Autoridade", bio: aiResult.bio_variacao_autoridade, rationale: "Foco em credenciais e prova social" },
          { label: "Conexão", bio: aiResult.bio_variacao_conexao, rationale: "Foco em conexão com o público" },
          { label: "Ação", bio: aiResult.bio_variacao_acao, rationale: "Foco em conversão e vendas" },
        ] : undefined,
      }
    : {
        current_bio: profile.bio_text,
        suggested_bio: templateBio.suggested,
        rationale_short: templateBio.rationale,
        cta_option: templateBio.cta,
      };

  const weeklyResult = weeklyContentResult
    ? applyWeeklyQualityGate(weeklyContentResult)
    : null;
  const storiesResultProcessed = storiesResult
    ? applyStoriesQualityGate(storiesResult)
    : null;

  // Latest post = most recent post (first in the array, ordered by date)
  let latestPost = posts.length > 0 ? {
    ...posts[0],
    analysis: null,
    tier: undefined,
  } : null;

  // Proxy latest post thumbnail (reuse if same as top/worst)
  if (latestPost) {
    if (latestPost.post_id === topPostData?.post_id) {
      latestPost.thumb_url = topPostData.thumb_url;
    } else if (latestPost.post_id === worstPostData?.post_id) {
      latestPost.thumb_url = worstPostData.thumb_url;
    } else {
      latestPost.thumb_url = await proxyPostThumbnail(
        profile.handle, latestPost.post_id, latestPost.thumb_url, supabaseAdmin,
      ).catch(() => latestPost!.thumb_url);
    }
  }

  const result = {
    profile,
    deliverables: {
      bio_suggestion,
      latest_post: latestPost,
      top_post: topPostData || null,
      worst_post: worstPostData || null,
      weekly_content_plan: weeklyResult || null,
      stories_plan: storiesResultProcessed || null,
      hashtag_strategy: enrichmentResult?.hashtag_strategy || undefined,
    },
    limits: { posts_analyzed: posts.length, note: "Diagnóstico objetivo" },
    plan: "free" as const,
  };

  return result;
}

// Run Phase 3 (stories/weekly/enrichment) in background and update DB record
async function runDeferredEnrichment(
  resultId: string,
  profile: ReturnType<typeof normalizeProfile>,
  nicho: string,
  objetivo: string,
  captions: string[],
  topPostInsights: string,
  worstPostInsights: string,
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
) {
  try {
    console.log(`runDeferredEnrichment: starting for @${profile.handle}`);

    const [weeklyContentResult, storiesResult, enrichmentResult] = await Promise.all([
      generateWeeklyContent(profile, nicho, objetivo, captions, topPostInsights, worstPostInsights)
        .catch((err) => { console.error("generateWeeklyContent crashed:", err); return null; }),
      generateStories(profile, nicho, objetivo, captions, topPostInsights)
        .catch((err) => { console.error("generateStories crashed:", err); return null; }),
      generateEnrichment(profile, nicho, objetivo)
        .catch((err) => { console.error("generateEnrichment crashed:", err); return null; }),
    ]);

    const weeklyResult = weeklyContentResult
      ? applyWeeklyQualityGate(weeklyContentResult)
      : null;
    const storiesResultProcessed = storiesResult
      ? applyStoriesQualityGate(storiesResult)
      : null;

    console.log(`runDeferredEnrichment: weekly=${weeklyResult ? "OK" : "NULL"}, stories=${storiesResultProcessed ? "OK" : "NULL"}, enrichment=${enrichmentResult ? "OK" : "NULL"}`);

    // Fetch existing result_json, merge in Phase 3 data, update
    const { data: existing } = await supabaseAdmin
      .from("analysis_result")
      .select("result_json")
      .eq("id", resultId)
      .single();

    if (existing) {
      // deno-lint-ignore no-explicit-any
      const resultJson = existing.result_json as any;
      resultJson.deliverables.weekly_content_plan = weeklyResult || null;
      resultJson.deliverables.stories_plan = storiesResultProcessed || null;
      resultJson.deliverables.hashtag_strategy = enrichmentResult?.hashtag_strategy || undefined;
      delete resultJson._deferred;

      await supabaseAdmin
        .from("analysis_result")
        .update({ result_json: resultJson })
        .eq("id", resultId);

      console.log(`runDeferredEnrichment: DB updated for result ${resultId}`);
    }
  } catch (err) {
    console.error("runDeferredEnrichment error:", (err as Error).message);
  }
}

function buildPremiumResult(
  profile: ReturnType<typeof normalizeProfile>,
  posts: ReturnType<typeof normalizePosts>,
  nichoKey: string,
  nicho: string,
  objetivo: string,
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
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
        const cached = cachedResults[0].result_json as Record<string, unknown>;
        const deliverables = cached?.deliverables as Record<string, unknown> | undefined;
        // If cache is missing weekly_content_plan, delete stale cache and re-analyze
        if (deliverables && !deliverables.weekly_content_plan) {
          console.log(`Cache stale for ${cleanHandle} (missing weekly_content_plan), re-analyzing...`);
          await supabaseAdmin
            .from("analysis_result")
            .delete()
            .eq("handle", cleanHandle)
            .eq("user_id", userId);
        } else {
          return json({ success: true, data: cached }, 200);
        }
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

    // ── [5] If NOT authenticated → return FAST partial pending_result ─────
    // Only run bio + posts analysis (~15s), skip weekly/stories/hashtags
    // Enrichment will run after the user logs in and the analysis is persisted
    if (!userId) {
      const captions_free = posts.map(p => p.caption_preview).filter(Boolean).slice(0, 5);
      let topIdx_free = 0, worstIdx_free = 0;
      for (let i = 1; i < posts.length; i++) {
        if (posts[i].metrics.engagement_score > posts[topIdx_free].metrics.engagement_score) topIdx_free = i;
        if (posts[i].metrics.engagement_score < posts[worstIdx_free].metrics.engagement_score) worstIdx_free = i;
      }

      // Phase 1 only: Bio + Posts in parallel (~10-15s)
      const [aiResult_free, postsBundle_free] = await Promise.all([
        analyzeBioWithAI(profile, nicho!, objetivo!, captions_free),
        (async () => {
          const [topTx, worstTx] = await Promise.all([
            posts[topIdx_free].post_type === "Video"
              ? transcribeVideo(posts[topIdx_free].video_url, posts[topIdx_free].uses_original_audio, posts[topIdx_free].music_info)
              : Promise.resolve({ text: null, skipped_reason: null }),
            posts[worstIdx_free].post_type === "Video"
              ? transcribeVideo(posts[worstIdx_free].video_url, posts[worstIdx_free].uses_original_audio, posts[worstIdx_free].music_info)
              : Promise.resolve({ text: null, skipped_reason: null }),
          ]);
          const postsAi = await analyzePostsWithAI(
            profile, posts[topIdx_free], posts[worstIdx_free], posts, nicho!, objetivo!,
            topTx.text, worstTx.text,
          );
          const topPD = {
            ...posts[topIdx_free],
            analysis: postsAi?.top_post_analysis || null,
            tier: (postsAi?.top_post_analysis?.classificacao || posts[topIdx_free].tier) as "gold" | "silver" | "bronze",
            transcript: topTx.text || undefined,
            transcript_skipped_reason: topTx.skipped_reason || undefined,
          };
          const worstPD = {
            ...posts[worstIdx_free],
            analysis: postsAi?.worst_post_analysis || null,
            tier: (postsAi?.worst_post_analysis?.classificacao || posts[worstIdx_free].tier) as "gold" | "silver" | "bronze",
            transcript: worstTx.text || undefined,
            transcript_skipped_reason: worstTx.skipped_reason || undefined,
          };
          const [tThumb, wThumb] = await Promise.all([
            proxyPostThumbnail(profile.handle, topPD.post_id, topPD.thumb_url, supabaseAdmin).catch(() => topPD.thumb_url),
            proxyPostThumbnail(profile.handle, worstPD.post_id, worstPD.thumb_url, supabaseAdmin).catch(() => worstPD.thumb_url),
          ]);
          topPD.thumb_url = tThumb;
          worstPD.thumb_url = wThumb;
          return { topPostData: topPD, worstPostData: worstPD };
        })(),
      ]);

      const { topPostData: topPD_free, worstPostData: worstPD_free } = postsBundle_free || {
        topPostData: { ...posts[topIdx_free], analysis: null, tier: posts[topIdx_free].tier },
        worstPostData: { ...posts[worstIdx_free], analysis: null, tier: posts[worstIdx_free].tier },
      };

      const templateBio_free = NICHO_BIOS[nichoKey] || NICHO_BIOS["default"];
      const defaultRubric_free: AIBioRubric = { clareza: 1, autoridade: 1, forca_cta: 1, seo_descoberta: 1, voz_da_marca: 1, especificidade: 1 };
      const safeRubric_free = (r: AIBioRubric | undefined): AIBioRubric => r && typeof r.clareza === "number" ? r : defaultRubric_free;
      const sumRubric_free = (r: AIBioRubric) => r.clareza + r.autoridade + r.forca_cta + r.seo_descoberta + r.voz_da_marca + r.especificidade;

      const bio_free = aiResult_free
        ? {
            current_bio: profile.bio_text,
            suggested_bio: aiResult_free.bio_sugerida,
            rationale_short: aiResult_free.justificativa_bio,
            cta_option: aiResult_free.cta_sugerido,
            score: parseFloat(((sumRubric_free(safeRubric_free(aiResult_free.rubrica_bio_atual)) / 30) * 10).toFixed(1)),
            score_new: parseFloat(((sumRubric_free(safeRubric_free(aiResult_free.rubrica_bio_nova)) / 30) * 10).toFixed(1)),
            criteria: {
              clarity: safeRubric_free(aiResult_free.rubrica_bio_atual).clareza,
              authority: safeRubric_free(aiResult_free.rubrica_bio_atual).autoridade,
              cta: safeRubric_free(aiResult_free.rubrica_bio_atual).forca_cta,
              seo: safeRubric_free(aiResult_free.rubrica_bio_atual).seo_descoberta,
              brand_voice: safeRubric_free(aiResult_free.rubrica_bio_atual).voz_da_marca,
              specificity: safeRubric_free(aiResult_free.rubrica_bio_atual).especificidade,
            },
            criteria_new: {
              clarity: safeRubric_free(aiResult_free.rubrica_bio_nova).clareza,
              authority: safeRubric_free(aiResult_free.rubrica_bio_nova).autoridade,
              cta: safeRubric_free(aiResult_free.rubrica_bio_nova).forca_cta,
              seo: safeRubric_free(aiResult_free.rubrica_bio_nova).seo_descoberta,
              brand_voice: safeRubric_free(aiResult_free.rubrica_bio_nova).voz_da_marca,
              specificity: safeRubric_free(aiResult_free.rubrica_bio_nova).especificidade,
            },
            diagnostic: aiResult_free.analise_diagnostica || {},
            strengths: aiResult_free.pontos_fortes,
            improvements: aiResult_free.pontos_de_melhoria,
            name_keyword: aiResult_free.sugestao_keyword_nome,
            detected_tone: aiResult_free.analise_diagnostica?.tom_de_voz,
            variations: aiResult_free.bio_variacao_autoridade ? [
              { label: "Autoridade", bio: aiResult_free.bio_variacao_autoridade, rationale: "Foco em credenciais e prova social" },
              { label: "Conexão", bio: aiResult_free.bio_variacao_conexao, rationale: "Foco em conexão com o público" },
              { label: "Ação", bio: aiResult_free.bio_variacao_acao, rationale: "Foco em conversão e vendas" },
            ] : undefined,
          }
        : {
            current_bio: profile.bio_text,
            suggested_bio: templateBio_free.suggested,
            rationale_short: templateBio_free.rationale,
            cta_option: templateBio_free.cta,
          };

      // Latest post thumbnail
      let latestPost_free = posts.length > 0 ? { ...posts[0], analysis: null, tier: undefined } : null;
      if (latestPost_free) {
        if (latestPost_free.post_id === topPD_free?.post_id) {
          latestPost_free.thumb_url = topPD_free.thumb_url;
        } else if (latestPost_free.post_id === worstPD_free?.post_id) {
          latestPost_free.thumb_url = worstPD_free.thumb_url;
        } else {
          latestPost_free.thumb_url = await proxyPostThumbnail(
            profile.handle, latestPost_free.post_id, latestPost_free.thumb_url, supabaseAdmin,
          ).catch(() => latestPost_free!.thumb_url);
        }
      }

      const pendingResult = {
        profile,
        deliverables: {
          bio_suggestion: bio_free,
          latest_post: latestPost_free,
          top_post: topPD_free || null,
          worst_post: worstPD_free || null,
          weekly_content_plan: null as null,
          stories_plan: null as null,
          hashtag_strategy: undefined as undefined,
        },
        limits: { posts_analyzed: posts.length, note: "Diagnóstico objetivo" },
        plan: "free" as const,
      };

      return json({ code: "AUTH_REQUIRED", pending_result: pendingResult }, 200);
    }

    // ── [6] Authenticated → check plan limits ────────────────
    const { data: userProfile } = await supabaseAdmin
      .from("users_profiles")
      .select("plan, free_analysis_used, analysis_credits")
      .eq("id", userId)
      .single();

    if (!userProfile) {
      // Auto-create profile if missing
      await supabaseAdmin.from("users_profiles").insert({
        id: userId,
        email: "",
        plan: "free",
        free_analysis_used: false,
        analysis_credits: 0,
      });
    }

    const plan = userProfile?.plan || "free";
    const freeUsed = userProfile?.free_analysis_used || false;
    const credits = userProfile?.analysis_credits || 0;
    let useCredit = false;

    if (plan === "free" && freeUsed) {
      if (credits > 0) {
        useCredit = true;
      } else {
        return json({ code: "FREE_LIMIT_REACHED" }, 403);
      }
    }

    // ── [7] Build fast partial result (bio + posts only) ─────
    // Returns immediately with profile, bio, posts — no waiting for weekly/stories/hashtags
    const captions = posts.map(p => p.caption_preview).filter(Boolean).slice(0, 5);
    let topIdx = 0, worstIdx = 0;
    for (let i = 1; i < posts.length; i++) {
      if (posts[i].metrics.engagement_score > posts[topIdx].metrics.engagement_score) topIdx = i;
      if (posts[i].metrics.engagement_score < posts[worstIdx].metrics.engagement_score) worstIdx = i;
    }
    const basicTopInsights = `Top post tem engagement score de ${posts[topIdx].metrics.engagement_score}. Formato: ${posts[topIdx].post_type}. Caption: "${posts[topIdx].caption_preview}".`;
    const basicWorstInsights = `Worst post tem engagement score de ${posts[worstIdx].metrics.engagement_score}. Formato: ${posts[worstIdx].post_type}.`;

    // Phase 1: Bio + Posts analysis in parallel (fast, ~10-15s)
    const [aiResult, postsAnalysisBundle] = await Promise.all([
      analyzeBioWithAI(profile, nicho!, objetivo!, captions),
      (async () => {
        const [topTranscript, worstTranscript] = await Promise.all([
          posts[topIdx].post_type === "Video"
            ? transcribeVideo(posts[topIdx].video_url, posts[topIdx].uses_original_audio, posts[topIdx].music_info)
            : Promise.resolve({ text: null, skipped_reason: null }),
          posts[worstIdx].post_type === "Video"
            ? transcribeVideo(posts[worstIdx].video_url, posts[worstIdx].uses_original_audio, posts[worstIdx].music_info)
            : Promise.resolve({ text: null, skipped_reason: null }),
        ]);
        const postsAiResult = await analyzePostsWithAI(
          profile, posts[topIdx], posts[worstIdx], posts, nicho!, objetivo!,
          topTranscript.text, worstTranscript.text,
        );
        const topPostData = {
          ...posts[topIdx],
          analysis: postsAiResult?.top_post_analysis || null,
          tier: (postsAiResult?.top_post_analysis?.classificacao || posts[topIdx].tier) as "gold" | "silver" | "bronze",
          transcript: topTranscript.text || undefined,
          transcript_skipped_reason: topTranscript.skipped_reason || undefined,
        };
        const worstPostData = {
          ...posts[worstIdx],
          analysis: postsAiResult?.worst_post_analysis || null,
          tier: (postsAiResult?.worst_post_analysis?.classificacao || posts[worstIdx].tier) as "gold" | "silver" | "bronze",
          transcript: worstTranscript.text || undefined,
          transcript_skipped_reason: worstTranscript.skipped_reason || undefined,
        };
        const [topThumb, worstThumb] = await Promise.all([
          proxyPostThumbnail(profile.handle, topPostData.post_id, topPostData.thumb_url, supabaseAdmin)
            .catch(() => topPostData.thumb_url),
          proxyPostThumbnail(profile.handle, worstPostData.post_id, worstPostData.thumb_url, supabaseAdmin)
            .catch(() => worstPostData.thumb_url),
        ]);
        topPostData.thumb_url = topThumb;
        worstPostData.thumb_url = worstThumb;
        return { topPostData, worstPostData };
      })(),
    ]);

    const { topPostData, worstPostData } = postsAnalysisBundle || {
      topPostData: { ...posts[topIdx], analysis: null, tier: posts[topIdx].tier },
      worstPostData: { ...posts[worstIdx], analysis: null, tier: posts[worstIdx].tier },
    };

    // Build bio_suggestion from AI result
    const templateBio = NICHO_BIOS[nichoKey] || NICHO_BIOS["default"];
    const defaultRubric: AIBioRubric = { clareza: 1, autoridade: 1, forca_cta: 1, seo_descoberta: 1, voz_da_marca: 1, especificidade: 1 };
    const safeRubric = (r: AIBioRubric | undefined): AIBioRubric => r && typeof r.clareza === "number" ? r : defaultRubric;
    const sumRubric = (r: AIBioRubric) => r.clareza + r.autoridade + r.forca_cta + r.seo_descoberta + r.voz_da_marca + r.especificidade;

    const bio_suggestion = aiResult
      ? {
          current_bio: profile.bio_text,
          suggested_bio: aiResult.bio_sugerida,
          rationale_short: aiResult.justificativa_bio,
          cta_option: aiResult.cta_sugerido,
          score: parseFloat(((sumRubric(safeRubric(aiResult.rubrica_bio_atual)) / 30) * 10).toFixed(1)),
          score_new: parseFloat(((sumRubric(safeRubric(aiResult.rubrica_bio_nova)) / 30) * 10).toFixed(1)),
          criteria: {
            clarity: safeRubric(aiResult.rubrica_bio_atual).clareza,
            authority: safeRubric(aiResult.rubrica_bio_atual).autoridade,
            cta: safeRubric(aiResult.rubrica_bio_atual).forca_cta,
            seo: safeRubric(aiResult.rubrica_bio_atual).seo_descoberta,
            brand_voice: safeRubric(aiResult.rubrica_bio_atual).voz_da_marca,
            specificity: safeRubric(aiResult.rubrica_bio_atual).especificidade,
          },
          criteria_new: {
            clarity: safeRubric(aiResult.rubrica_bio_nova).clareza,
            authority: safeRubric(aiResult.rubrica_bio_nova).autoridade,
            cta: safeRubric(aiResult.rubrica_bio_nova).forca_cta,
            seo: safeRubric(aiResult.rubrica_bio_nova).seo_descoberta,
            brand_voice: safeRubric(aiResult.rubrica_bio_nova).voz_da_marca,
            specificity: safeRubric(aiResult.rubrica_bio_nova).especificidade,
          },
          diagnostic: aiResult.analise_diagnostica || {},
          strengths: aiResult.pontos_fortes,
          improvements: aiResult.pontos_de_melhoria,
          name_keyword: aiResult.sugestao_keyword_nome,
          detected_tone: aiResult.analise_diagnostica?.tom_de_voz,
          variations: aiResult.bio_variacao_autoridade ? [
            { label: "Autoridade", bio: aiResult.bio_variacao_autoridade, rationale: "Foco em credenciais e prova social" },
            { label: "Conexão", bio: aiResult.bio_variacao_conexao, rationale: "Foco em conexão com o público" },
            { label: "Ação", bio: aiResult.bio_variacao_acao, rationale: "Foco em conversão e vendas" },
          ] : undefined,
        }
      : {
          current_bio: profile.bio_text,
          suggested_bio: templateBio.suggested,
          rationale_short: templateBio.rationale,
          cta_option: templateBio.cta,
        };

    // Latest post thumbnail proxy
    let latestPost = posts.length > 0 ? { ...posts[0], analysis: null, tier: undefined } : null;
    if (latestPost) {
      if (latestPost.post_id === topPostData?.post_id) {
        latestPost.thumb_url = topPostData.thumb_url;
      } else if (latestPost.post_id === worstPostData?.post_id) {
        latestPost.thumb_url = worstPostData.thumb_url;
      } else {
        latestPost.thumb_url = await proxyPostThumbnail(
          profile.handle, latestPost.post_id, latestPost.thumb_url, supabaseAdmin,
        ).catch(() => latestPost!.thumb_url);
      }
    }

    // Build partial result (no weekly/stories/hashtags yet)
    const isPremiumBuild = plan === "premium" || useCredit;
    const partialResult = {
      profile,
      deliverables: {
        bio_suggestion,
        latest_post: latestPost,
        top_post: topPostData || null,
        worst_post: worstPostData || null,
        weekly_content_plan: null as null,
        stories_plan: null as null,
        hashtag_strategy: undefined as undefined,
        ...(isPremiumBuild ? {
          posts_analysis: posts,
          competitors_analysis: [],
          strategic_score: null,
          improvement_plan: null,
          pdf_available: true,
        } : {}),
      },
      limits: { posts_analyzed: posts.length, note: "Diagnóstico objetivo" },
      plan: (isPremiumBuild ? "premium" : "free") as "free" | "premium",
      _deferred: true,
    };

    // ── [8] Persist partial result ───────────────────────────
    const { data: reqInsert } = await supabaseAdmin
      .from("analysis_request")
      .insert({
        user_id: userId,
        handle: cleanHandle,
        nicho: nicho!,
        objetivo: objetivo!,
        plan_at_time: useCredit ? "credit" : plan,
      })
      .select("id")
      .single();

    let resultId: string | null = null;
    if (reqInsert) {
      const { data: insertedResult } = await supabaseAdmin.from("analysis_result").insert({
        request_id: reqInsert.id,
        handle: cleanHandle,
        result_json: partialResult,
        user_id: userId,
        unlocked_at: useCredit ? new Date().toISOString() : null,
      }).select("id").single();
      resultId = insertedResult?.id || null;
    }

    // ── [9] Update user profile ────────────────────────────
    if (useCredit) {
      await supabaseAdmin
        .from("users_profiles")
        .update({ analysis_credits: credits - 1 })
        .eq("id", userId);
    } else if (plan === "free") {
      await supabaseAdmin
        .from("users_profiles")
        .update({ free_analysis_used: true })
        .eq("id", userId);
    }

    // ── [10] Return partial result immediately ───────────────
    // Then run enrichment (weekly/stories/hashtags) in background
    // The frontend listens for DB updates via Supabase Realtime
    if (resultId) {
      // Use EdgeRuntime.waitUntil to keep function alive after response
      // deno-lint-ignore no-explicit-any
      const runtime = (globalThis as any).EdgeRuntime;
      if (runtime?.waitUntil) {
        runtime.waitUntil(
          runDeferredEnrichment(
            resultId, profile, nicho!, objetivo!, captions,
            basicTopInsights, basicWorstInsights, supabaseAdmin,
          ).catch((err: Error) => console.error("Deferred enrichment failed:", err.message))
        );
      } else {
        // Fallback: await inline (slower but guarantees completion)
        await runDeferredEnrichment(
          resultId, profile, nicho!, objetivo!, captions,
          basicTopInsights, basicWorstInsights, supabaseAdmin,
        ).catch((err) => console.error("Deferred enrichment failed:", err));
      }
    }

    return json({ success: true, data: partialResult }, 200);
  } catch (err) {
    console.error("edrion-analyze error:", err);
    return json({ code: "INTERNAL_ERROR", message: (err as Error).message }, 500);
  }
});
