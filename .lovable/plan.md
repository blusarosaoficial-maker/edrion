

# Analise de Bio com IA (OpenAI) -- Implementacao

## Visao Geral

Substituir as sugestoes de bio estaticas (templates por nicho) por uma analise personalizada gerada pela OpenAI, usando o prompt detalhado fornecido. A IA vai analisar a bio real do perfil considerando nicho e objetivo, retornando nota, pontos fortes, melhorias e nova bio.

## Arquitetura da Solucao

```text
┌─────────────┐     ┌──────────────────────┐     ┌──────────┐
│  Frontend   │────>│  edrion-analyze      │────>│  Apify   │
│  (igual)    │     │  (edge function)     │     │ (scrape) │
│             │<────│                      │     └──────────┘
│             │     │  apos scraping:      │
│             │     │  chama OpenAI ───────│────>  OpenAI API
│             │     │  monta resultado     │<────  (resposta)
└─────────────┘     └──────────────────────┘
```

A chamada a OpenAI acontece dentro da edge function, no servidor. O frontend nao muda a forma como chama a API -- so recebe dados mais ricos na resposta.

## Arquivos Alterados

| Arquivo | Acao | Risco |
|---------|------|-------|
| `supabase/functions/edrion-analyze/index.ts` | Adicionar chamada OpenAI no `buildFreeResult` | Baixo -- fallback para template se IA falhar |
| `src/types/analysis.ts` | Expandir `BioSuggestion` com novos campos | Zero -- campos opcionais |
| `src/components/ResultView.tsx` | Exibir nota, criterios, pontos fortes/melhoria | Baixo -- renderiza novos campos se existirem |

## Passo 1: Adicionar secret OPENAI_API_KEY

Solicitar ao usuario a chave da API OpenAI e armazenar como secret no Supabase (acessivel na edge function via `Deno.env.get("OPENAI_API_KEY")`).

## Passo 2: Modificar `edrion-analyze/index.ts`

### Nova funcao `analyzeBioWithAI`

Chama a API da OpenAI (`POST https://api.openai.com/v1/chat/completions`) usando **tool calling** para obter resposta estruturada (mais confiavel que parsear texto livre).

Parametros enviados ao modelo:
- System prompt: o prompt completo fornecido pelo usuario
- User message: dados do perfil (handle, nome, bio, seguidores, nicho, objetivo)
- Tool definition: schema estruturado com os campos esperados

Schema do tool calling:
```text
{
  profession_name: "Presente" | "Ausente",
  service: "Presente" | "Ausente",
  authority: "Presente" | "Ausente",
  call_to_action: "Presente" | "Ausente",
  score: number (0-10),
  strengths: string,
  improvements: string,
  suggested_bio: string (max 149 chars),
  rationale: string,
  cta_option: string
}
```

### Modificar `buildFreeResult`

Tornar a funcao `async`. Antes de montar o `bio_suggestion`:
1. Tentar chamar `analyzeBioWithAI(profile, nicho, objetivo)`
2. Se sucesso: usar dados da IA
3. Se falha (timeout, erro, sem API key): fallback para template estatico atual (NICHO_BIOS)

Modelo utilizado: `gpt-4o-mini` (rapido, barato, suficiente para analise de texto curto).

### Remover templates NICHO_BIOS?

Nao. Manter como fallback. Se a OpenAI estiver fora, lenta, ou sem creditos, o sistema continua funcionando com os templates.

## Passo 3: Expandir tipo `BioSuggestion`

Adicionar campos opcionais ao `BioSuggestion` em `src/types/analysis.ts`:

```text
BioSuggestion {
  current_bio: string          (ja existe)
  suggested_bio: string        (ja existe)
  rationale_short: string      (ja existe)
  cta_option: string           (ja existe)
  // Novos campos (opcionais)
  score?: number               // nota 0-10
  criteria?: {
    profession_name: string    // "Presente" | "Ausente"
    service: string
    authority: string
    call_to_action: string
  }
  strengths?: string           // pontos fortes
  improvements?: string        // pontos de melhoria
}
```

Campos opcionais para manter compatibilidade com dados em cache e fallback.

## Passo 4: Atualizar `ResultView.tsx`

Na secao "Sugestao de Bio", adicionar (apenas se os novos campos existirem):

1. **Nota geral**: badge com X/10 no header da secao
2. **Criterios**: 4 itens com icone check (Presente) ou X (Ausente)
3. **Pontos fortes**: texto em verde sutil
4. **Pontos de melhoria**: texto em amarelo/laranja sutil
5. Manter a comparacao atual bio vs sugerida e o CTA

Layout condicional: se `bio_suggestion.score` existe, mostra a versao rica. Senao, mostra a versao simples atual. Isso garante que resultados em cache continuam funcionando.

## Seguranca

- API key armazenada como secret no Supabase, nunca exposta no frontend
- Chamada a OpenAI feita server-side na edge function
- Input sanitizado (bio truncada em 500 chars, handle validado)
- Timeout de 15s na chamada OpenAI para nao travar a resposta

## Impacto Zero nas Funcionalidades Existentes

- Login/signup: sem mudanca
- Fluxo de scraping (Apify): sem mudanca
- Top/worst post: sem mudanca
- Next post suggestion: sem mudanca
- Cache de resultados: sem mudanca (novos campos opcionais)
- Mock (dev): sem mudanca
- Plano premium: sem mudanca

