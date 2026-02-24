

# Alinhar Schema e Tipos ao Novo Prompt

## Problema Confirmado

O prompt esta perfeito, mas 3 partes do codigo impedem a IA de seguir o que o prompt pede:

1. **`userMessage` (linha 537)**: diz "Avalie a bio nos 4 criterios" -- contradiz os 6 criterios do prompt
2. **Tool schema (linhas 564-577)**: so aceita 4 campos binarios (Presente/Ausente) -- a IA nao consegue devolver as notas 1-5 dos 6 criterios, nem `name_keyword`
3. **Interface `AIBioResult` (linhas 247-258)**: nao tem os campos novos

O resultado: a IA faz a analise completa internamente (seguindo o prompt), mas na hora de responder so consegue preencher os campos velhos do schema.

## Mudancas

### Arquivo 1: `supabase/functions/edrion-analyze/index.ts`

**a) Interface `AIBioResult` (linhas 247-258)** -- substituir por:

```text
interface AIBioResult {
  rubric_clarity: number;       // 1-5
  rubric_authority: number;     // 1-5
  rubric_cta: number;           // 1-5
  rubric_seo: number;           // 1-5
  rubric_brand_voice: number;   // 1-5
  rubric_specificity: number;   // 1-5
  score: number;                // 0-10 geral
  strengths: string;
  improvements: string;
  suggested_bio: string;
  rationale: string;
  cta_option: string;
  name_keyword: string;
  detected_tone: string;
}
```

**b) `userMessage` (linhas 526-537)** -- substituir instrucao final por:

```text
Execute o processo completo de duas fases conforme suas instrucoes.
Avalie a bio atual na rubrica de 6 criterios (1-5 cada), identifique
pontos fortes e melhorias, detecte o tom de voz, sugira keyword para
o campo Nome, e gere uma nova bio estrategica (maximo 149 caracteres).
```

**c) Tool schema (linhas 556-583)** -- substituir properties e required:

Remover: `profession_name`, `service`, `authority`, `call_to_action` (binarios)

Adicionar:
- `rubric_clarity` (number, 1-5, "Clareza: quao claro e o que a pessoa faz")
- `rubric_authority` (number, 1-5, "Autoridade: provas e diferenciais")
- `rubric_cta` (number, 1-5, "Forca do CTA")
- `rubric_seo` (number, 1-5, "SEO e descoberta no Instagram")
- `rubric_brand_voice` (number, 1-5, "Voz da marca")
- `rubric_specificity` (number, 1-5, "Especificidade de publico e resultado")
- `name_keyword` (string, "Sugestao de keyword para o campo Nome do Instagram")

Manter: `score`, `strengths`, `improvements`, `suggested_bio`, `rationale`, `cta_option`, `detected_tone`

**d) Mapeamento em `buildFreeResult` (linhas 635-656)** -- substituir `criteria` por novos campos:

```text
criteria: {
  clarity: aiResult.rubric_clarity,
  authority: aiResult.rubric_authority,
  cta: aiResult.rubric_cta,
  seo: aiResult.rubric_seo,
  brand_voice: aiResult.rubric_brand_voice,
  specificity: aiResult.rubric_specificity,
},
name_keyword: aiResult.name_keyword,
detected_tone: aiResult.detected_tone,
```

### Arquivo 2: `src/types/analysis.ts`

Substituir `BioCriteria` e expandir `BioSuggestion`:

```text
interface BioCriteria {
  clarity: number;       // 1-5
  authority: number;     // 1-5
  cta: number;           // 1-5
  seo: number;           // 1-5
  brand_voice: number;   // 1-5
  specificity: number;   // 1-5
}

interface BioSuggestion {
  current_bio: string;
  suggested_bio: string;
  rationale_short: string;
  cta_option: string;
  score?: number;
  criteria?: BioCriteria;
  strengths?: string;
  improvements?: string;
  name_keyword?: string;
  detected_tone?: string;
}
```

### Arquivo 3: `src/components/BioAnalysisSection.tsx`

Redesenhar para exibir:

- **6 criterios com nota 1-5** (barra de progresso colorida + numero) em vez de "Presente/Ausente"
  - Verde (4-5), Amarelo (3), Vermelho (1-2)
  - Labels: Clareza, Autoridade, Forca do CTA, SEO, Voz da Marca, Especificidade
- **Tom detectado** (ex: "Tom identificado: informal e descontraido")
- **Sugestao de Nome** (ex: "Sugestao para Nome: Maria | Nutricionista Esportiva")
- Manter: score geral, pontos fortes, melhorias, comparacao de bio, CTA sugerido

### Arquivo 4: `src/services/analyze.ts`

Atualizar mock para retornar os novos campos (rubrica numerica, name_keyword, detected_tone).

## O que NAO muda

- System prompt (ja esta correto e completo)
- Modelo OpenAI (gpt-4o-mini)
- Fluxo de scraping, auth, cache, posts
- Fallback para templates estaticos
- ResultView.tsx (importa BioAnalysisSection que cuida de tudo)

## Sequencia

1. Tipos (`analysis.ts`)
2. Edge function (interface + userMessage + schema + mapeamento)
3. Frontend (`BioAnalysisSection.tsx`)
4. Mock (`analyze.ts`)
5. Deploy da edge function

