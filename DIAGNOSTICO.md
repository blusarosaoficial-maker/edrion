# DIAGNÓSTICO — Fluxo de Análise de Bio do Instagram

Este arquivo contém o código real de cada etapa do fluxo de análise de bio, extraído dos arquivos do projeto. Nenhum código foi resumido ou parafraseado.

---

## SEÇÃO 1: SYSTEM PROMPT

**Arquivo:** `supabase/functions/edrion-analyze/index.ts`, linha 288  
**Variável:** `const systemPrompt` (dentro da função `analyzeBioWithAI`)

```typescript
const systemPrompt = `Você é uma especialista sênior em Social Selling, copywriting de alta conversão, SEO para Instagram e posicionamento estratégico de perfis profissionais.

<missao>

Sua missão é executar um processo de duas fases: primeiro, realizar uma análise diagnóstica profunda da bio atual; segundo, gerar uma nova bio estratégica, otimizada e alinhada ao objetivo do perfil. Toda resposta DEVE ser enviada exclusivamente via tool call fornecida.

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

Com base na análise da Fase 1, gere a nova bio seguindo estas diretrizes:

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

AUTO-AVALIAÇÃO OBRIGATÓRIA:

Após gerar a nova bio, pontue-a na mesma rubrica de 6 critérios (1-5). Se qualquer critério ficar abaixo de 4, revise internamente antes de apresentar. A bio final apresentada deve ter pontuação mínima de 4 em todos os critérios.

</fase_2_geracao_estrategica>

<exemplos_referencia>

EXEMPLO 1 — Profissional de Saúde:

Nicho: Nutricionista esportiva | Objetivo: Vender consultorias

Bio atual: "Nutri | CRN 12345 | Consultório em SP | Atendo presencial e online"

Problemas: Função em vez de transformação, sem público-alvo, sem CTA, zero diferencial

Nova bio:

"Nutrição estratégica p/ atletas que querem performance máxima

+500 protocolos personalizados | Método NutriPeak

Agende sua avaliação 👇"

(148 caracteres)

Por que funciona: Transformação clara, público específico, prova numérica, método proprietário, CTA com emoji direcional.

EXEMPLO 2 — Marketing Digital:

Nicho: Social media para negócios locais | Objetivo: Gerar leads

Bio atual: "Especialista em redes sociais | Apaixonada por marketing | Criatividade e resultados"

Problemas: Genérico, sem público, "apaixonada" não é diferencial, sem CTA

Nova bio:

"Loto a agenda de negócios locais com Instagram estratégico

Método testado em +80 empresas de SP

Diagnóstico grátis no link 👇"

(128 caracteres)

Por que funciona: Resultado concreto (lotar agenda), público (negócios locais), prova (+80 empresas), CTA com isca (diagnóstico grátis).

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

</regras_criticas>`;
```

---

## SEÇÃO 2: TOOL / FUNCTION DEFINITION

**Arquivo:** `supabase/functions/edrion-analyze/index.ts`, linha 571  
**Contexto:** Passado dentro do `body` do `fetch` para `https://api.openai.com/v1/chat/completions`

```typescript
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
          bio_sugerida: { type: "string", description: "Nova bio otimizada com no máximo 149 caracteres, em 3 linhas estratégicas", maxLength: 149 },
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
```

---

## SEÇÃO 3: USER MESSAGE (MENSAGEM DO USUÁRIO)

**Arquivo:** `supabase/functions/edrion-analyze/index.ts`, linhas 542-552  
**Variáveis:** `legendas` (linha 542) e `userMessage` (linha 544)

```typescript
const legendas = captions.length > 0 ? `\n\nLegendas recentes:\n${captions.map(c => `- "${c}"`).join("\n")}` : "";

const userMessage = `Analise a bio do perfil @${profile.handle}.
Nicho: ${nicho}.
Objetivo principal: ${objetivo.toUpperCase()}.
Bio atual: ${(profile.bio_text || "").slice(0, 500)}
Seguidores: ${profile.followers} | Seguindo: ${profile.following} | Posts: ${profile.posts_count}

Execute o processo completo de duas fases. Retorne analise diagnostica,
rubrica da bio atual (1-5 cada), pontos fortes/melhorias, keyword para Nome,
nova bio (max 149 chars), rubrica da bio nova, justificativa e CTA.${legendas}`;
```

**Variáveis interpoladas:**
- `profile.handle` — @ do perfil (ex: `michamenezes`)
- `nicho` — nicho selecionado pelo usuário (ex: `Marketing Digital`)
- `objetivo.toUpperCase()` — objetivo em maiúsculas (ex: `VENDER MAIS`)
- `profile.bio_text` — bio atual do perfil (truncada em 500 chars)
- `profile.followers`, `profile.following`, `profile.posts_count` — métricas do perfil
- `legendas` — legendas dos 5 posts mais recentes, formatadas como lista

---

## SEÇÃO 4: CHAMADA À API

**Arquivo:** `supabase/functions/edrion-analyze/index.ts`, linhas 554-658  
**Função:** `analyzeBioWithAI` (chamada dentro de `buildFreeResult`)

```typescript
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
        // ... (schema completo da SEÇÃO 2)
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
  if (parsed.bio_sugerida && parsed.bio_sugerida.length > 149) {
    parsed.bio_sugerida = parsed.bio_sugerida.slice(0, 149);
  }
  return parsed;
} catch (err) {
  console.error("analyzeBioWithAI error:", (err as Error).message);
  return null;
} finally {
  clearTimeout(timeout);
}
```

**Detalhes:**
- Modelo: `gpt-4o-mini`
- Timeout: 15 segundos (`AbortController`)
- Tool choice: forçado para `analyze_bio`
- Parsing: `JSON.parse(toolCall.function.arguments)` cast para `AIBioResult`
- Enforce: se `bio_sugerida` > 149 chars, trunca com `.slice(0, 149)`

---

## SEÇÃO 5: PROCESSAMENTO DA RESPOSTA

### 5A — Mapeamento na Edge Function (`buildFreeResult`)

**Arquivo:** `supabase/functions/edrion-analyze/index.ts`, linhas 663-732

```typescript
async function buildFreeResult(
  profile: ReturnType<typeof normalizeProfile>,
  posts: ReturnType<typeof normalizePosts>,
  nichoKey: string,
  nicho: string,
  objetivo: string,
) {
  // Try AI analysis first, fallback to template
  const captions = posts.map(p => p.caption_preview).filter(Boolean).slice(0, 5);
  const aiResult = await analyzeBioWithAI(profile, nicho, objetivo, captions);
  const templateBio = NICHO_BIOS[nichoKey] || NICHO_BIOS["default"];

  let topIdx = 0;
  let worstIdx = 0;
  for (let i = 1; i < posts.length; i++) {
    if (posts[i].metrics.engagement_score > posts[topIdx].metrics.engagement_score) topIdx = i;
    if (posts[i].metrics.engagement_score < posts[worstIdx].metrics.engagement_score) worstIdx = i;
  }

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
```

**Mapeamento de campos (AI → Frontend):**
| Campo AI (`AIBioResult`) | Campo Frontend (`BioSuggestion`) |
|---|---|
| `rubrica_bio_atual.clareza` | `criteria.clarity` |
| `rubrica_bio_atual.autoridade` | `criteria.authority` |
| `rubrica_bio_atual.forca_cta` | `criteria.cta` |
| `rubrica_bio_atual.seo_descoberta` | `criteria.seo` |
| `rubrica_bio_atual.voz_da_marca` | `criteria.brand_voice` |
| `rubrica_bio_atual.especificidade` | `criteria.specificity` |
| `rubrica_bio_nova.*` | `criteria_new.*` (mesmo padrão) |
| `(soma rubrica / 30) * 10` | `score` e `score_new` |
| `analise_diagnostica` | `diagnostic` |
| `analise_diagnostica.tom_de_voz` | `detected_tone` |
| `pontos_fortes` | `strengths` |
| `pontos_de_melhoria` | `improvements` |
| `sugestao_keyword_nome` | `name_keyword` |
| `justificativa_bio` | `rationale_short` |
| `cta_sugerido` | `cta_option` |
| `bio_sugerida` | `suggested_bio` |

### 5B — Serviço Frontend (`analyzeProfile`)

**Arquivo:** `src/services/analyze.ts`, linhas 27-86

```typescript
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
```

**Nota:** O `responseData.data` é passado diretamente para o frontend sem transformação adicional. A estrutura vem pronta da edge function (`buildFreeResult`).

### 5C — Componente de UI (`BioAnalysisSection`)

**Arquivo:** `src/components/BioAnalysisSection.tsx` (componente completo, 247 linhas)

```tsx
import {
  FileText,
  CheckCircle2,
  XCircle,
  Zap,
  Mic,
  Search,
  ChevronDown,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Lightbulb,
} from "lucide-react";
import type { BioSuggestion, BioCriteria, BioDiagnostic } from "@/types/analysis";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

interface Props {
  bio: BioSuggestion;
}

const CRITERIA_LABELS: { key: keyof BioCriteria; label: string }[] = [
  { key: "clarity", label: "Clareza" },
  { key: "authority", label: "Autoridade" },
  { key: "cta", label: "Força do CTA" },
  { key: "seo", label: "SEO / Descoberta" },
  { key: "brand_voice", label: "Voz da Marca" },
  { key: "specificity", label: "Especificidade" },
];

const DIAGNOSTIC_LABELS: { key: keyof BioDiagnostic; label: string }[] = [
  { key: "proposta_valor", label: "Proposta de Valor" },
  { key: "segmentacao_publico", label: "Segmentação de Público" },
  { key: "gatilhos_autoridade", label: "Gatilhos e Autoridade" },
  { key: "cta_conversao", label: "CTA e Conversão" },
  { key: "seo_instagram", label: "SEO no Instagram" },
  { key: "tom_de_voz", label: "Tom de Voz" },
];

function scoreColor(v: number) {
  if (v >= 4) return "bg-primary";
  if (v >= 3) return "bg-yellow-500";
  return "bg-destructive";
}

function scoreTextColor(v: number) {
  if (v >= 4) return "text-primary";
  if (v >= 3) return "text-yellow-500";
  return "text-destructive";
}

function RubricItem({ label, value, compareValue }: { label: string; value: number; compareValue?: number }) {
  const diff = compareValue !== undefined ? compareValue - value : undefined;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-bold ${scoreTextColor(value)}`}>{value}/5</span>
          {diff !== undefined && diff !== 0 && (
            <span className={`text-xs font-bold flex items-center gap-0.5 ${diff > 0 ? "text-primary" : "text-destructive"}`}>
              {diff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {diff > 0 ? "+" : ""}{diff}
            </span>
          )}
        </div>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-all ${scoreColor(value)}`}
          style={{ width: `${value * 20}%` }}
        />
      </div>
    </div>
  );
}

export default function BioAnalysisSection({ bio }: Props) {
  const hasAI = bio.score !== undefined;
  const [diagOpen, setDiagOpen] = useState(false);
  const bioTooLong = bio.suggested_bio.length > 149;

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header with comparative scores */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <FileText className="w-5 h-5 text-primary" />
        <h3 className="text-foreground font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Análise de Bio
        </h3>
        {hasAI && (
          <div className="ml-auto flex items-center gap-2">
            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
              (bio.score ?? 0) >= 7 ? "bg-primary/10 text-primary" : (bio.score ?? 0) >= 4 ? "bg-yellow-500/10 text-yellow-600" : "bg-destructive/10 text-destructive"
            }`}>
              {bio.score}/10
            </span>
            {bio.score_new !== undefined && (
              <>
                <span className="text-muted-foreground text-xs">→</span>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-primary/10 text-primary">
                  {bio.score_new}/10
                </span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* 6-criteria rubric - Bio Atual */}
        {hasAI && bio.criteria && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rubrica — Bio Atual</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 rounded-lg bg-secondary border border-border">
              {CRITERIA_LABELS.map(({ key, label }) => (
                <RubricItem
                  key={key}
                  label={label}
                  value={bio.criteria![key]}
                  compareValue={bio.criteria_new?.[key]}
                />
              ))}
            </div>
          </div>
        )}

        {/* Diagnostic analysis (collapsible) */}
        {hasAI && bio.diagnostic && (
          <Collapsible open={diagOpen} onOpenChange={setDiagOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left p-3 rounded-lg bg-secondary border border-border hover:bg-secondary/80 transition-colors">
              <Lightbulb className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-medium text-foreground flex-1">Análise Diagnóstica</span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${diagOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {DIAGNOSTIC_LABELS.map(({ key, label }) => (
                <div key={key} className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <p className="text-xs font-semibold text-primary mb-1">{label}</p>
                  <p className="text-sm text-foreground/80">{bio.diagnostic![key]}</p>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Detected tone */}
        {hasAI && bio.detected_tone && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary border border-border">
            <Mic className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm text-foreground">
              <span className="font-medium">Tom identificado:</span>{" "}
              <span className="text-muted-foreground">{bio.detected_tone}</span>
            </span>
          </div>
        )}

        {/* Name keyword suggestion */}
        {hasAI && bio.name_keyword && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Search className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm text-foreground">
              <span className="font-medium">Sugestão para Nome:</span>{" "}
              <span className="text-muted-foreground">{bio.name_keyword}</span>
            </span>
          </div>
        )}

        {/* Strengths & Improvements */}
        {hasAI && bio.strengths && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-xs font-medium text-primary mb-1">Pontos Fortes</p>
            <p className="text-sm text-foreground/80">{bio.strengths}</p>
          </div>
        )}
        {hasAI && bio.improvements && (
          <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
            <p className="text-xs font-medium text-accent mb-1">Pontos de Melhoria</p>
            <p className="text-sm text-foreground/80">{bio.improvements}</p>
          </div>
        )}

        {/* Bio comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <XCircle className="w-3.5 h-3.5 text-destructive" /> Atual
              {hasAI && bio.score !== undefined && (
                <span className="ml-auto text-xs font-bold text-muted-foreground">{bio.score}/10</span>
              )}
            </div>
            <p className="text-sm text-foreground/80 bg-secondary rounded-lg p-3 border border-border whitespace-pre-line">
              {bio.current_bio}
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Sugerida
              {bio.score_new !== undefined && (
                <span className="ml-auto text-xs font-bold text-primary">{bio.score_new}/10</span>
              )}
            </div>
            <p className="text-sm text-foreground bg-primary/10 rounded-lg p-3 border border-primary/20 whitespace-pre-line">
              {bioTooLong ? bio.suggested_bio.slice(0, 149) : bio.suggested_bio}
            </p>
            {bioTooLong && (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertTriangle className="w-3 h-3" />
                Bio truncada (original: {bio.suggested_bio.length} chars, limite: 149)
              </div>
            )}
            <p className="text-xs text-muted-foreground text-right">{Math.min(bio.suggested_bio.length, 149)}/149 chars</p>
          </div>
        </div>

        {/* Rubric - Bio Nova */}
        {hasAI && bio.criteria_new && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rubrica — Bio Sugerida</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
              {CRITERIA_LABELS.map(({ key, label }) => (
                <RubricItem
                  key={key}
                  label={label}
                  value={bio.criteria_new![key]}
                />
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground italic">
          💡 {bio.rationale_short}
        </p>
        <div className="flex items-center gap-2 text-sm">
          <Zap className="w-4 h-4 text-accent" />
          <span className="text-foreground font-medium">CTA sugerido:</span>
          <span className="text-muted-foreground">{bio.cta_option}</span>
        </div>
      </div>
    </section>
  );
}
```
