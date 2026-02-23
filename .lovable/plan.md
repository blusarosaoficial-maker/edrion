

# Fase 2: Backend Real com Supabase Edge Function

## Resumo

Substituir o mock (`analyzeMock`) por uma Edge Function Supabase que chama a API do Apify para coletar dados reais do Instagram, calcula engajamento e retorna o JSON no contrato existente. O front mantém fallback para mock em dev.

## Etapa 1: Secrets (APIFY_TOKEN e APIFY_ACTOR_ID)

Antes de qualquer codigo, solicitar ao usuario que adicione dois secrets no projeto Supabase:
- **APIFY_TOKEN** -- token de API do Apify
- **APIFY_ACTOR_ID** -- ID do actor que coleta perfil + posts do Instagram

## Etapa 2: Edge Function `edrion-analyze`

Criar `supabase/functions/edrion-analyze/index.ts` com:

### CORS + OPTIONS handler
Headers padrao permitindo chamadas do front.

### Validacao (422)
- Extrair `handle`, `nicho`, `objetivo` do body
- Limpar handle (remover `@`, trim, regex `^[a-zA-Z0-9._]{1,30}$`)
- nicho e objetivo obrigatorios
- Retornar 422 com `{ code: "VALIDATION_ERROR", details: [...] }` se falhar

### Chamada Apify
- Chamar `https://api.apify.com/v2/acts/{APIFY_ACTOR_ID}/run-sync-dataset` via POST
- Input: `{ "usernames": [handle], "resultsLimit": 12 }`
- Timeout de 12s via `AbortController`
- 1 retry em caso de falha/timeout
- Mapear erros:
  - Perfil privado detectado nos dados -> 403 `PRIVATE_PROFILE`
  - Perfil nao encontrado -> 404 `NOT_FOUND`
  - Timeout/erro de rede -> 504 `TIMEOUT`

### Normalizacao
- Extrair `profile` dos dados do Apify (handle, fullName, profilePicUrl, biography, followersCount, followsCount, postsCount, verified)
- Extrair ate 9 posts recentes com metricas (likesCount, commentsCount, videoViewCount)

### Calculo de Engajamento
- Se post tem views (video): `score = (likes + 2*comments) / views`
- Senao: `score = likes + 2*comments`
- Top = maior score, worst = menor score. Empate: mais recente vence.

### Diagnostico (bio + next post)
- Para V1, retornar sugestoes estaticas baseadas no nicho (reutilizar a logica do mock atual)
- Estrutura futura: substituir por chamada a LLM

### Response
Retornar JSON no contrato `AnalysisResponse` existente com status 200.

## Etapa 3: Config TOML

Adicionar ao `supabase/config.toml`:
```
[functions.edrion-analyze]
verify_jwt = false
```

## Etapa 4: Atualizar Service Layer

Modificar `src/services/analyze.ts`:
- Criar funcao `analyzeProfile(handle, nicho, objetivo)` que:
  1. Tenta `supabase.functions.invoke("edrion-analyze", { body: { handle, nicho, objetivo } })`
  2. Mapeia respostas de erro (403/404/504/422) para `AnalysisResponse` com o campo `error` correto
  3. Em caso de falha de conexao/config, faz fallback para `analyzeMock` (somente em dev: `import.meta.env.DEV`)
- Exportar `analyzeProfile` como funcao principal

## Etapa 5: Atualizar Index.tsx

- Trocar `analyzeMock` por `analyzeProfile` no import e na chamada
- Nenhuma outra mudanca na UI

## Decisoes Arquiteturais

| Decisao | Escolha | Motivo |
|---------|---------|--------|
| Persistencia (tabelas) | **Opcao A: sem tabelas agora** | V1 publico, sem autenticacao, sem necessidade de historico. Menos superficie de ataque. |
| Bio/next post suggestions | Estaticas por nicho (mock logic) | Evita dependencia de LLM nesta fase. Preparado para troca futura. |
| Fallback mock | Apenas em `import.meta.env.DEV` | Garante que producao sempre usa backend real |
| JWT | Desabilitado | Endpoint publico, sem auth nesta fase |

## Arquivos Criados/Modificados

| Arquivo | Acao |
|---------|------|
| `supabase/functions/edrion-analyze/index.ts` | Criar |
| `supabase/config.toml` | Editar (adicionar config da function) |
| `src/services/analyze.ts` | Editar (adicionar `analyzeProfile`, manter mock) |
| `src/pages/Index.tsx` | Editar (trocar import/chamada) |

## Secao Tecnica: Estrutura da Edge Function

```text
POST /edrion-analyze
  |
  +-- Validar body (422)
  |
  +-- Chamar Apify (12s timeout, 1 retry)
  |     |
  |     +-- Erro: perfil privado -> 403
  |     +-- Erro: nao encontrado -> 404
  |     +-- Erro: timeout -> 504
  |
  +-- Normalizar profile + posts
  |
  +-- Calcular engagement scores
  |
  +-- Montar bio_suggestion + next_post (estatico por nicho)
  |
  +-- Retornar AnalysisResponse (200)
```

