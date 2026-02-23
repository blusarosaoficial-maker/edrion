

# Implementacao Fase 2 - Com Credenciais Apify

## Etapa 1: Armazenar Secrets

Adicionar dois secrets ao projeto Supabase:
- **APIFY_TOKEN** = `apify_api_NwvJoV4JZGeEl2UgmY3b2IhUUbyk7L3mtsSf`
- **APIFY_ACTOR_ID** = `apify~instagram-scraper`

## Etapa 2: Criar Edge Function `edrion-analyze`

Arquivo: `supabase/functions/edrion-analyze/index.ts`

Implementar o pipeline completo:
1. CORS headers + OPTIONS handler
2. Validacao do body (handle, nicho, objetivo) com retorno 422
3. Chamada Apify via POST `https://api.apify.com/v2/acts/{APIFY_ACTOR_ID}/runs?token={APIFY_TOKEN}` com timeout 12s e 1 retry
4. Normalizacao do profile e posts (ate 9)
5. Calculo de engagement score
6. Sugestoes estaticas de bio e next post baseadas no nicho (reutilizando logica do mock)
7. Retorno no contrato `AnalysisResponse` existente
8. Mapeamento de erros: 403 PRIVATE_PROFILE, 404 NOT_FOUND, 504 TIMEOUT, 422 VALIDATION_ERROR

## Etapa 3: Atualizar config.toml

Adicionar `[functions.edrion-analyze]` com `verify_jwt = false`.

## Etapa 4: Atualizar Service Layer

Modificar `src/services/analyze.ts`:
- Nova funcao `analyzeProfile()` que chama `supabase.functions.invoke("edrion-analyze")`
- Mapeamento de erros do backend para o contrato `AnalysisResponse`
- Fallback para `analyzeMock` apenas em dev (`import.meta.env.DEV`)

## Etapa 5: Atualizar Index.tsx

- Trocar `analyzeMock` por `analyzeProfile` no import e chamada
- Zero mudancas na UI

## Nota sobre a API Apify

A URL fornecida usa o endpoint `/runs` (assincrono). Para o fluxo sincrono que precisamos (esperar resultado), usaremos `/run-sync-dataset` que retorna os dados diretamente na resposta, evitando polling. Se esse endpoint nao estiver disponivel para o actor, faremos `/runs` + polling do dataset.

