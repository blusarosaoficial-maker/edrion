
# Atualizar System Prompt da Analise de Bio

## O que muda

Apenas o conteudo do `systemPrompt` dentro da funcao `analyzeBioWithAI` no arquivo `supabase/functions/edrion-analyze/index.ts` (linhas 272-296).

O novo prompt e significativamente mais completo e estruturado, com duas fases (diagnostico + geracao), rubrica de avaliacao detalhada, exemplos de referencia, e regras criticas mais robustas. Ele substitui o prompt atual integralmente.

## Arquivo alterado

| Arquivo | Mudanca | Risco |
|---------|---------|-------|
| `supabase/functions/edrion-analyze/index.ts` | Substituir `systemPrompt` (linhas 272-296) pelo novo prompt fornecido | Zero -- so muda o texto enviado a OpenAI, nada mais |

## O que NAO muda

- Assinatura da funcao `analyzeBioWithAI` -- mesma
- Parametro `captions` -- continua sendo passado
- `userMessage` -- mesmo formato com dados do perfil e legendas
- Tool calling schema -- mesmo (profession_name, service, authority, call_to_action, score, strengths, improvements, suggested_bio, rationale, cta_option, detected_tone)
- Modelo (`gpt-4o-mini`) -- mesmo
- Fallback para templates -- continua funcionando
- Frontend -- zero mudanca
- Tipos -- zero mudanca
- Qualquer outro fluxo (scraping, auth, cache, posts) -- zero mudanca

## Detalhe tecnico

A substituicao e literal: o conteudo entre as crases do `const systemPrompt = \`...\`` sera trocado pelo prompt completo fornecido pelo usuario, incluindo todas as tags XML (`<missao>`, `<fase_1_analise_diagnostica>`, `<fase_2_geracao_estrategica>`, `<exemplos_referencia>`, `<regras_criticas>`).

O novo prompt ja inclui a analise de tom de voz (Etapa 6 da Fase 1) e a preservacao de tom (na Fase 2), entao a funcionalidade implementada anteriormente continua coberta -- agora com instrucoes ainda mais detalhadas.

Apos a substituicao, a edge function sera re-deployada.
