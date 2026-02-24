

# Criar DIAGNOSTICO.md -- Fluxo de Analise de Bio

Criar um unico arquivo `DIAGNOSTICO.md` na raiz do projeto contendo o codigo real de cada etapa do fluxo de analise de bio, extraido dos arquivos do projeto.

## Conteudo do arquivo

O arquivo tera 5 secoes, cada uma com o codigo completo copiado dos arquivos reais:

### SECAO 1: SYSTEM PROMPT
- **Arquivo**: `supabase/functions/edrion-analyze/index.ts`, linhas 288-540
- Variavel: `const systemPrompt` dentro da funcao `analyzeBioWithAI`
- Conteudo completo: prompt de ~250 linhas com missao, fase_1_analise_diagnostica (6 etapas + rubrica), fase_2_geracao_estrategica (6 principios + ajuste por objetivo + auto-avaliacao), exemplos_referencia (3 exemplos) e regras_criticas (9 regras)

### SECAO 2: TOOL / FUNCTION DEFINITION
- **Arquivo**: `supabase/functions/edrion-analyze/index.ts`, linhas 571-631
- Schema com objetos aninhados: `analise_diagnostica` (6 campos textuais), `rubrica_bio_atual` (6 notas 1-5), `nota_geral`, `pontos_fortes`, `pontos_de_melhoria`, `sugestao_keyword_nome`, `bio_sugerida` (maxLength 149), `rubrica_bio_nova` (6 notas 1-5), `justificativa_bio`, `cta_sugerido`
- Todos required, com `additionalProperties: false`

### SECAO 3: USER MESSAGE
- **Arquivo**: `supabase/functions/edrion-analyze/index.ts`, linhas 544-552
- Variavel `userMessage` que interpola: `profile.handle`, `nicho`, `objetivo.toUpperCase()`, `profile.bio_text`, `profile.followers`, `profile.following`, `profile.posts_count`, e `legendas` (captions dos posts)

### SECAO 4: CHAMADA A API
- **Arquivo**: `supabase/functions/edrion-analyze/index.ts`, linhas 558-658
- `fetch("https://api.openai.com/v1/chat/completions")` com model `gpt-4o-mini`, messages (system + user), tools (schema), tool_choice forcado para `analyze_bio`
- Parsing da resposta: `JSON.parse(toolCall.function.arguments)` com enforce de 149 chars

### SECAO 5: PROCESSAMENTO DA RESPOSTA
- **Arquivo**: `supabase/functions/edrion-analyze/index.ts`, linhas 663-732 (funcao `buildFreeResult`)
  - Calcula `score` e `score_new` via `(sumRubric / 30) * 10`
  - Mapeia `rubrica_bio_atual` -> `criteria`, `rubrica_bio_nova` -> `criteria_new`, `analise_diagnostica` -> `diagnostic`, etc.
  - Fallback para template estatico se AI retornar null
- **Arquivo**: `src/services/analyze.ts`, linhas 27-86 (funcao `analyzeProfile`)
  - Faz fetch para edge function, trata codigos de resposta (AUTH_REQUIRED, FREE_LIMIT_REACHED, etc.)
  - Passa `responseData.data` direto para o frontend
- **Arquivo**: `src/components/BioAnalysisSection.tsx` (componente completo, 247 linhas)
  - Exibe score comparativo, rubrica de 6 criterios com barras coloridas, diagnostico expandivel, tom detectado, sugestao de nome, pontos fortes/melhorias, comparacao de bios, rubrica da bio nova, CTA sugerido

## Arquivo alterado

| Arquivo | Acao |
|---------|------|
| `DIAGNOSTICO.md` | Criar (novo) |

