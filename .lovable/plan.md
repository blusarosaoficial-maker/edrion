

# Implementacao do Modelo Final EDRION -- Controle por Usuario (nao por Handle)

## Mudanca Principal vs Plano Anterior

O plano anterior bloqueava qualquer handle ja analisado globalmente (`UNIQUE(handle)`). A nova regra permite que usuarios diferentes analisem o mesmo handle -- o controle e por usuario, nao por handle. Isso viabiliza analise de concorrentes sem bloqueio.

## Novo Fluxo ao Clicar "Analisar"

```text
Usuario clica "Analisar"
    |
    v
[1] Backend: Valida handle (formato)
    |
    v
[2] Backend: Checa auth (JWT)
    |-- Nao autenticado? --> AUTH_REQUIRED (401)
    |   Frontend abre Magic Link modal
    |   Apos login, re-submete automaticamente
    |
    v
[3] Backend: Checa users_profiles (plan, free_analysis_used)
    |-- free + free_analysis_used=true? --> FREE_LIMIT_REACHED (403)
    |
    v
[4] Backend: Checa analysis_result para (handle + user_id)
    |-- Existe? --> Retorna resultado cacheado (200)
    |
    v
[5] Backend: Chama Apify (primeiro gasto de credito)
    |
    v
[6] Backend: Persiste resultado + marca free_analysis_used=true
    |
    v
[7] Retorna resultado ao frontend
```

Diferenca chave: no passo 4, a busca e filtrada por `handle + user_id`. Se outro usuario ja analisou o mesmo handle, isso NAO bloqueia -- uma nova analise e feita e um novo registro e criado.

## Detalhes Tecnicos

### 1. Migration SQL

```sql
-- Remover indice global unico por handle
DROP INDEX IF EXISTS idx_analysis_result_handle;

-- Criar indice unico por (handle, request_id -> user_id)
-- Como analysis_result nao tem user_id direto, adicionar coluna user_id
ALTER TABLE analysis_result ADD COLUMN IF NOT EXISTS user_id uuid;

-- Indice unico: 1 resultado por handle POR usuario
CREATE UNIQUE INDEX idx_analysis_result_handle_user
  ON analysis_result(handle, user_id);

-- Remover coluna is_reanalysis (sem reanalise)
ALTER TABLE analysis_result DROP COLUMN IF EXISTS is_reanalysis;
```

Adicionar `user_id` diretamente em `analysis_result` simplifica as queries -- nao precisa fazer JOIN com `analysis_request` para verificar ownership.

### 2. Edge Function `edrion-analyze/index.ts` -- Reescrever fluxo

Ordem definitiva:

1. Validar handle
2. Checar auth --> se nao autenticado, retornar `{ code: "AUTH_REQUIRED" }` (401). SEM gastar Apify.
3. Checar `users_profiles` (plan/free_analysis_used) --> se free esgotado, `FREE_LIMIT_REACHED` (403)
4. Checar `analysis_result` filtrado por `handle = cleanHandle AND user_id = userId`:
   - Se existe --> retornar `result_json` cacheado (200)
   - Se nao existe --> continuar para Apify
5. Chamar Apify
6. Normalizar + proxy avatar
7. Persistir em `analysis_request` + `analysis_result` (incluindo `user_id`)
8. Marcar `free_analysis_used = true` (se free)
9. Retornar resultado

Remover completamente:
- Bloco de scraping sem auth (linhas 307-327 -- `EMAIL_REQUIRED`)
- Logica de `HANDLE_ALREADY_ANALYZED` (nao existe mais bloqueio global)

### 3. Deletar `edrion-save-after-signup`

Toda persistencia acontece dentro de `edrion-analyze` apos autenticacao. Remover:
- `supabase/functions/edrion-save-after-signup/index.ts`
- Entrada correspondente no `supabase/config.toml`

### 4. Frontend: Substituir `EmailCaptureModal` por `AuthModal` (Magic Link)

**Novo `src/components/AuthModal.tsx`**:
- Input de email apenas
- Chama `supabase.auth.signInWithOtp({ email })`
- Mostra mensagem "Verifique seu email" apos envio
- Listener em `onAuthStateChange` para detectar login
- Ao detectar sessao valida, chama `onSuccess()`

### 5. Frontend: `src/pages/Index.tsx`

- Substituir `EmailCaptureModal` por `AuthModal`
- Remover `saveAfterSignup`, `pendingResult`, `pendingInputs`
- `handleSubmit`:
  - `auth_required` --> abre `AuthModal`, guarda handle/nicho/objetivo em estado temporario
  - Apos login (`handleAuthSuccess`): re-submete `analyzeProfile()` automaticamente com JWT
  - `free_limit` --> tela de upgrade
  - `success` --> mostrar resultado
- Remover tratamento de `handle_taken` (nao existe mais)
- Loading overlay aparece APENAS quando Apify esta rodando (apos auth confirmado)

### 6. Frontend: `src/services/analyze.ts`

- Remover `saveAfterSignup`
- Remover mapeamento de `HANDLE_ALREADY_ANALYZED`
- Adicionar mapeamento para `AUTH_REQUIRED` --> `auth_required`

### 7. Frontend: `src/types/analysis.ts`

- Substituir `"email_required"` e `"handle_taken"` por `"auth_required"` no tipo `AnalysisError`
- Remover `pending_result` do `AnalysisResponse`
- Remover `reanalysis_available` do `AnalysisResult`

### 8. `supabase/config.toml`

Remover entrada de `edrion-save-after-signup`. Manter apenas:
```toml
[functions.edrion-analyze]
verify_jwt = false
```

## Resumo dos Arquivos

| Arquivo | Acao |
|---------|------|
| Migration SQL | DROP UNIQUE(handle), ADD user_id, CREATE UNIQUE(handle, user_id), DROP is_reanalysis |
| `supabase/functions/edrion-analyze/index.ts` | Reescrever: auth antes de Apify, busca por (handle+user_id) |
| `supabase/functions/edrion-save-after-signup/` | DELETAR |
| `supabase/config.toml` | Remover entrada save-after-signup |
| `src/components/AuthModal.tsx` | CRIAR (Magic Link Supabase) |
| `src/components/EmailCaptureModal.tsx` | DELETAR |
| `src/pages/Index.tsx` | Refatorar (AuthModal + re-submit apos login) |
| `src/services/analyze.ts` | Remover saveAfterSignup, adicionar auth_required |
| `src/types/analysis.ts` | Atualizar tipos (remover handle_taken, email_required, pending_result) |

## Regras de Negocio Garantidas

- Mesmo handle pode ser analisado por usuarios diferentes (analise de concorrentes)
- 1 analise FREE por usuario (controlado por `free_analysis_used`)
- 1 analise PREMIUM por compra
- Sem reanalise
- Sem assinatura mensal
- Apify so e chamado APOS autenticacao confirmada
- Plano decidido exclusivamente no backend

