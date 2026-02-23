
# Plano Completo: Nova Arquitetura EDRION — Scraping Antes de Auth + Email/Senha

## Mudanca Fundamental

O fluxo atual exige login ANTES de rodar o Apify. O novo fluxo inverte: roda o Apify primeiro (loading completo com dados do perfil), e so exige login antes de EXIBIR o resultado final. Alem disso, substitui Magic Link por email+senha (signUp / signInWithPassword).

## Novo Fluxo Completo

```text
Usuario clica "Analisar"
    |
    v
[1] Edge function: Valida handle
    |
    v
[2] Se autenticado: checa cache (handle + user_id)
    |-- Existe? --> Retorna resultado cacheado (200)
    |
    v
[3] Chama Apify (scraping completo)
    |   Frontend mostra loading com dados do perfil
    |
    v
[4] Se NAO autenticado:
    |   --> Retorna { code: "AUTH_REQUIRED", pending_result: {...} }
    |   Frontend armazena resultado em estado
    |   Abre modal de login/cadastro (email+senha)
    |   Apos auth --> chama edrion-save-result para persistir
    |   --> Exibe resultado
    |
    v
[5] Se autenticado:
    |   Checa plan (free_analysis_used)
    |   Se free esgotado --> FREE_LIMIT_REACHED
    |   Persiste resultado
    |   Marca free_analysis_used = true
    |   --> Retorna resultado
```

## Detalhes Tecnicos

### 1. Migration SQL

Nenhuma migration necessaria -- o schema atual ja tem `user_id` em `analysis_result` e o indice `UNIQUE(handle, user_id)` ja foi criado na migration anterior.

### 2. Edge Function `edrion-analyze/index.ts` -- Reescrever

Mudancas principais na ordem de execucao:

1. Validar handle, nicho, objetivo
2. Checar auth:
   - Se autenticado: checar cache (handle + user_id). Se existe, retornar resultado cacheado imediatamente
   - Se nao autenticado: continuar (sem checar cache -- nao tem user_id)
3. Chamar Apify (scraping)
4. Normalizar dados + proxy avatar
5. Build result (free ou premium baseado no plano do usuario, ou free por default se nao autenticado)
6. Se NAO autenticado:
   - Retornar `{ code: "AUTH_REQUIRED", pending_result: result }` (status 200)
   - NAO persistir nada
7. Se autenticado:
   - Checar `users_profiles` (plan, free_analysis_used)
   - Se free e free_analysis_used=true --> `FREE_LIMIT_REACHED`
   - Persistir em `analysis_request` + `analysis_result`
   - Marcar `free_analysis_used = true` (se free)
   - Retornar resultado

### 3. NOVA Edge Function `edrion-save-result/index.ts`

Endpoint chamado pelo frontend APOS o usuario se autenticar, para persistir o resultado que ja foi calculado.

Recebe: `{ handle, nicho, objetivo, result }` (o resultado completo que o frontend guardou)

Fluxo:
1. Exigir auth (JWT obrigatorio)
2. Checar cache (handle + user_id) -- se ja existe, retornar sucesso sem duplicar
3. Checar plan limits (free_analysis_used)
4. Se free e ja usado --> `FREE_LIMIT_REACHED`
5. Persistir em `analysis_request` + `analysis_result` (com user_id)
6. Marcar `free_analysis_used = true` (se free)
7. Retornar `{ success: true }`

Adicionar ao `supabase/config.toml`:
```
[functions.edrion-save-result]
verify_jwt = false
```

### 4. Frontend: `src/components/AuthModal.tsx` -- Reescrever com Email+Senha

Substituir Magic Link por formulario com duas abas/modos:

**Modo "Entrar"** (signInWithPassword):
- Email + Senha
- Botao "Entrar"

**Modo "Criar conta"** (signUp):
- Email + Senha + Confirmar senha
- Botao "Criar conta"

Toggle entre os modos via link "Nao tem conta? Crie agora" / "Ja tem conta? Entre"

Props mantidas: `isOpen`, `onSuccess`, `onClose`

Ao detectar `SIGNED_IN` via `onAuthStateChange` ou apos signIn/signUp bem-sucedido: chamar `onSuccess()`

### 5. Frontend: `src/pages/Index.tsx` -- Novo fluxo

Adicionar estado `pendingResult` para armazenar o resultado quando AUTH_REQUIRED.

Adicionar link "Entrar" no topo direito (usando `useAuth` do contexto).

Fluxo do `runAnalysis`:
1. Chama `analyzeProfile()` --> loading overlay
2. Se resposta tem `pending_result` (AUTH_REQUIRED):
   - Armazenar `pending_result` em estado
   - Armazenar `pendingInputs` (handle, nicho, objetivo)
   - Loading overlay continua mostrando dados (isDone=true, profileSnapshot preenchido)
   - Abrir AuthModal
3. Se resposta sucesso (autenticado):
   - Mostrar resultado normalmente

`handleAuthSuccess`:
1. Fechar modal
2. Chamar `saveResult(pendingInputs, pendingResult)` -- nova funcao no service
3. Se sucesso: mostrar resultado (ja armazenado)
4. Se FREE_LIMIT_REACHED: tela upgrade

### 6. Frontend: Header com "Entrar" / "Sair"

Adicionar no `Index.tsx` (ou criar componente `Header`):
- Se nao autenticado: link "Entrar" no topo direito (abre AuthModal)
- Se autenticado: texto discreto com email + link "Sair"
- `supabase.auth.signOut()` para logout

### 7. Frontend: `src/services/analyze.ts` -- Atualizar

Adicionar mapeamento para `pending_result`:
- Se `responseData?.code === "AUTH_REQUIRED"` E `responseData?.pending_result`:
  - Retornar `{ success: false, error: "auth_required", pendingResult: responseData.pending_result }`

Adicionar nova funcao `saveResult()`:
- Chama edge function `edrion-save-result`
- Envia JWT + dados pendentes
- Retorna sucesso ou codigo de erro

### 8. Frontend: `src/types/analysis.ts` -- Atualizar

Adicionar `pendingResult` opcional no `AnalysisResponse`:
```
export interface AnalysisResponse {
  success: boolean;
  data?: AnalysisResult;
  error?: AnalysisError;
  pendingResult?: AnalysisResult;
}
```

### 9. Frontend: `src/contexts/AuthContext.tsx` -- Manter

Ja funciona corretamente. O `useAuth()` sera usado no header para mostrar estado de login.

## Resumo de Arquivos

| Arquivo | Acao |
|---------|------|
| `supabase/functions/edrion-analyze/index.ts` | Reescrever: scraping antes de auth, retornar pending_result se nao autenticado |
| `supabase/functions/edrion-save-result/index.ts` | CRIAR: persistir resultado apos autenticacao |
| `supabase/config.toml` | Adicionar entrada edrion-save-result |
| `src/components/AuthModal.tsx` | Reescrever: email+senha (signUp/signIn) em vez de Magic Link |
| `src/pages/Index.tsx` | Refatorar: novo fluxo com pendingResult, header com Entrar/Sair |
| `src/services/analyze.ts` | Adicionar saveResult(), atualizar mapeamento de auth_required |
| `src/types/analysis.ts` | Adicionar pendingResult ao AnalysisResponse |

## Regras de Negocio Garantidas

- Scraping roda ANTES de exigir login (UX fluida)
- Login e por email+senha, NAO Magic Link
- 1 analise FREE por usuario (free_analysis_used)
- 1 analise PREMIUM por compra
- Mesmo handle pode ser analisado por usuarios diferentes
- Cache por (handle + user_id) -- resultado reutilizado para o mesmo usuario
- Plano decidido exclusivamente no backend
- Sem reanalise, sem assinatura mensal
- Link "Entrar" discreto no topo direito
