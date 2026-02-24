

# Corrigir Sistema de Analise de Bio -- Schema Completo

## Problema

O schema atual da tool call e flat e incompleto. Faltam:
- Analise diagnostica textual (6 etapas do prompt)
- Rubrica da bio NOVA (auto-avaliacao)
- Nota geral calculada a partir da rubrica (nao inventada)
- Objetivo passado de forma clara no userMessage

## Mudancas

### 1. Edge Function (`supabase/functions/edrion-analyze/index.ts`)

**a) Interface `AIBioResult` (linhas 247-262)** -- substituir por estrutura aninhada:

```text
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
}
```

**b) Tool schema (linhas 560-589)** -- substituir pelo schema exato fornecido pelo usuario, com objetos aninhados `analise_diagnostica`, `rubrica_bio_atual`, `rubrica_bio_nova` e todos os campos required.

**c) userMessage (linha 530-541)** -- garantir que o objetivo e passado em MAIUSCULAS e de forma explicita:

```text
Analise a bio do perfil @${profile.handle}.
Nicho: ${nicho}.
Objetivo principal: ${objetivo.toUpperCase()}.
Bio atual: ${profile.bio_text}
Seguidores: ${profile.followers} | Seguindo: ${profile.following} | Posts: ${profile.posts_count}

Execute o processo completo de duas fases. Retorne analise diagnostica,
rubrica da bio atual (1-5 cada), pontos fortes/melhorias, keyword para Nome,
nova bio (max 149 chars), rubrica da bio nova, justificativa e CTA.
${legendas}
```

**d) buildFreeResult (linhas 642-667)** -- mapear novos campos para o frontend:

- `criteria` (bio atual) vem de `rubrica_bio_atual`
- `criteria_new` (bio nova) vem de `rubrica_bio_nova`
- `score` recalculado: `(soma rubrica_bio_atual) / 30 * 10`
- `score_new` calculado: `(soma rubrica_bio_nova) / 30 * 10`
- `diagnostic` vem de `analise_diagnostica`
- `name_keyword` vem de `sugestao_keyword_nome`
- `detected_tone` vem de `analise_diagnostica.tom_de_voz`

### 2. Tipos Frontend (`src/types/analysis.ts`)

Expandir `BioSuggestion` com novos campos:

```text
export interface BioCriteria {
  clarity: number;       // 1-5
  authority: number;     // 1-5
  cta: number;           // 1-5
  seo: number;           // 1-5
  brand_voice: number;   // 1-5
  specificity: number;   // 1-5
}

export interface BioDiagnostic {
  proposta_valor: string;
  segmentacao_publico: string;
  gatilhos_autoridade: string;
  cta_conversao: string;
  seo_instagram: string;
  tom_de_voz: string;
}

export interface BioSuggestion {
  current_bio: string;
  suggested_bio: string;
  rationale_short: string;
  cta_option: string;
  score?: number;
  score_new?: number;
  criteria?: BioCriteria;
  criteria_new?: BioCriteria;
  diagnostic?: BioDiagnostic;
  strengths?: string;
  improvements?: string;
  name_keyword?: string;
  detected_tone?: string;
}
```

### 3. Frontend (`src/components/BioAnalysisSection.tsx`)

Redesenhar para exibir:

- **Score comparativo**: "Bio atual: 3.2/10 -> Bio sugerida: 8.5/10"
- **6 criterios da bio ATUAL** com nota 1-5 (barras coloridas verde/amarelo/vermelho)
- **Analise diagnostica** (6 textos expandiveis ou em cards)
- **Tom identificado** e **Sugestao de Nome**
- **Comparacao de bios** (atual vs sugerida lado a lado)
- **6 criterios da bio NOVA** (barras coloridas para comparar)
- **Pontos fortes e melhorias**
- **CTA sugerido**
- **Validacao frontend**: se bio_sugerida > 149 chars, truncar e avisar

### 4. Mock (`src/services/analyze.ts`)

Atualizar mock com todos os novos campos (diagnostic, criteria_new, score_new).

## O que NAO muda

- System prompt (ja esta correto)
- Modelo OpenAI (gpt-4o-mini)
- Fluxo de scraping, auth, cache, posts
- Fallback para templates estaticos (sem os campos extras)
- ResultView.tsx (importa BioAnalysisSection)

## Sequencia

1. Tipos (`analysis.ts`)
2. Edge function (interface + schema + userMessage + mapeamento)
3. Frontend (`BioAnalysisSection.tsx`)
4. Mock (`analyze.ts`)
5. Deploy da edge function

