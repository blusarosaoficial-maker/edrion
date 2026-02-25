

# Redeploy da edge function edrion-analyze

## Situacao

O codigo ja esta sincronizado com o GitHub. A funcionalidade de analise de posts com IA ja esta presente no arquivo `supabase/functions/edrion-analyze/index.ts`:

- Interfaces `AIPostRubric`, `AIPostAnalysis`, `AIPostsResult` (linhas 711-736)
- Funcao `analyzePostsWithAI` com system prompt dedicado para analise de posts (linhas 738+)
- Schema de tool call `analyze_posts` com rubrica, classificacao gold/silver/bronze e recomendacoes
- Integracao dos resultados da IA nos objetos `topPostData` e `worstPostData` (linhas 1008-1009)

O componente `PostAnalysisModal.tsx` tambem ja esta presente no projeto.

## Acao

Executar redeploy da edge function `edrion-analyze` para que as alteracoes do GitHub fiquem ativas no Supabase.

## O que muda com este deploy

- Top Post e Worst Post agora recebem analise detalhada por IA via tool call `analyze_posts`
- Cada post recebe rubrica de 5 criterios (gancho, legenda, formato, engajamento, estrategia)
- Classificacao qualitativa Gold/Silver/Bronze
- Nota geral de 0-10
- Fatores positivos e negativos
- Analise detalhada de gancho, legenda, formato e hashtags
- 3-5 recomendacoes acionaveis por post

