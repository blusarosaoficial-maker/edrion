

# EDRION - Camada de Negocio Completa (PRD 2.1)

## Resumo

Implementar o backend real com Apify, controle por handle, captura obrigatoria de e-mail no FREE, separacao FREE vs PREMIUM, persistencia e limite de 1 analise gratuita. Loading mais lento para melhor UX.

---

## Etapa 1: Secrets

Adicionar ao Supabase:
- **APIFY_TOKEN** = `apify_api_NwvJoV4JZGeEl2UgmY3b2IhUUbyk7L3mtsSf`
- **APIFY_ACTOR_ID** = `apify~instagram-scraper`

---

## Etapa 2: Migration SQL

### Tabela `users_profiles`
```sql
CREATE TABLE public.users_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  free_analysis_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.users_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON public.users_profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.users_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Service inserts profiles" ON public.users_profiles
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service updates profiles" ON public.users_profiles
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);
```

### Trigger: auto-criar perfil no signup
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users_profiles (id, email, plan, free_analysis_used)
  VALUES (NEW.id, NEW.email, 'free', false);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Tabela `analysis_request`
```sql
CREATE TABLE public.analysis_request (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  handle TEXT NOT NULL,
  nicho TEXT NOT NULL,
  objetivo TEXT NOT NULL,
  plan_at_time TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.analysis_request ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service manages requests" ON public.analysis_request
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Users read own requests" ON public.analysis_request
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
```

### Tabela `analysis_result`
```sql
CREATE TABLE public.analysis_result (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.analysis_request(id) ON DELETE CASCADE,
  handle TEXT NOT NULL,
  result_json JSONB NOT NULL,
  is_reanalysis BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.analysis_result ENABLE ROW LEVEL SECURITY;

-- Indice unico: 1 analise por handle
CREATE UNIQUE INDEX idx_analysis_result_handle ON public.analysis_result(handle);

CREATE POLICY "Service manages results" ON public.analysis_result
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Users read own results" ON public.analysis_result
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.analysis_request
    WHERE analysis_request.id = analysis_result.request_id
    AND analysis_request.user_id = auth.uid()
  ));
```

---

## Etapa 3: Edge Function `edrion-analyze`

Criar `supabase/functions/edrion-analyze/index.ts`

### Pipeline completo:

1. **CORS** - Headers padrao + OPTIONS
2. **Validar body** - handle (regex `^[a-zA-Z0-9._]{1,30}$`), nicho, objetivo -> 422
3. **Checar handle no banco** - Consultar `analysis_result` pelo handle
   - Se existe e pertence ao usuario logado (via JWT) -> retornar resultado salvo (sem rodar scraping)
   - Se existe e pertence a outro usuario -> retornar `{ code: "HANDLE_ALREADY_ANALYZED" }` status 409
   - Se nao existe -> continuar
4. **Checar autenticacao** - Extrair JWT do header Authorization
   - Se nao autenticado -> rodar scraping, gerar resultado, mas NAO salvar. Retornar `{ code: "EMAIL_REQUIRED", pending_result: resultado }` status 401
   - Se autenticado -> continuar
5. **Checar plano** - Consultar `users_profiles`
   - Se FREE e `free_analysis_used = true` -> retornar `{ code: "FREE_LIMIT_REACHED" }` status 403
   - Se FREE e `free_analysis_used = false` -> permitir
   - Se PREMIUM -> permitir
6. **Chamar Apify** - POST `run-sync-dataset` com timeout 12s e 1 retry
   - Mapear erros: privado -> 403 PRIVATE_PROFILE, nao encontrado -> 404 NOT_FOUND, timeout -> 504 TIMEOUT
7. **Normalizar** - Profile (handle, fullName, profilePicUrl, biography, followersCount, followsCount, postsCount, verified) + ate 9 posts
8. **Calcular engagement** - `(likes + 2*comments) / views` ou `likes + 2*comments` se sem views
9. **Montar resultado por plano**:
   - FREE: `{ profile, deliverables: { bio_suggestion, top_post, worst_post }, plan: "free" }`
   - PREMIUM: resultado completo com `bio_variations`, `posts_analysis`, `competitors_analysis`, `strategic_score`, `improvement_plan`, `pdf_available`, `reanalysis_available`
10. **Persistir** - Inserir `analysis_request` + `analysis_result`
11. **Atualizar** `free_analysis_used = true` se FREE
12. **Retornar** JSON com status 200

### Config TOML:
```toml
[functions.edrion-analyze]
verify_jwt = false
```
(JWT verificado manualmente no codigo para permitir fluxo nao-autenticado que retorna EMAIL_REQUIRED)

---

## Etapa 4: Edge Function `edrion-save-after-signup`

Criar `supabase/functions/edrion-save-after-signup/index.ts`

Quando o usuario cria conta apos receber `EMAIL_REQUIRED`, o frontend chama esta funcao com o resultado pendente para salvar:

1. Validar JWT (usuario recem-criado)
2. Receber `{ handle, nicho, objetivo, pending_result }` no body
3. Inserir `analysis_request` + `analysis_result`
4. Atualizar `free_analysis_used = true`
5. Retornar sucesso

```toml
[functions.edrion-save-after-signup]
verify_jwt = false
```

---

## Etapa 5: Atualizar Types

Modificar `src/types/analysis.ts`:

- Adicionar `plan: "free" | "premium"` ao `AnalysisResult`
- Remover `next_post_suggestion` do tipo base (agora e premium-only)
- Tornar `limits` opcional
- Adicionar campos opcionais premium: `bio_variations`, `posts_analysis`, `competitors_analysis`, `strategic_score`, `improvement_plan`, `pdf_available`, `reanalysis_available`
- Adicionar `"free_limit" | "email_required" | "handle_taken"` ao `AnalysisError`
- Adicionar `pending_result` opcional ao `AnalysisResponse`

---

## Etapa 6: Atualizar Service Layer

Modificar `src/services/analyze.ts`:

- Nova funcao `analyzeProfile(handle, nicho, objetivo)`:
  1. Chamar `supabase.functions.invoke("edrion-analyze", { body })`
  2. Mapear codigos de erro:
     - `EMAIL_REQUIRED` -> `{ error: "email_required", pending_result }`
     - `FREE_LIMIT_REACHED` -> `{ error: "free_limit" }`
     - `HANDLE_ALREADY_ANALYZED` -> `{ error: "handle_taken" }`
     - `PRIVATE_PROFILE` -> `{ error: "private" }`
     - `NOT_FOUND` -> `{ error: "not_found" }`
     - `TIMEOUT` -> `{ error: "timeout" }`
  3. Em dev (`import.meta.env.DEV`), fallback para `analyzeMock` se erro de conexao
- Nova funcao `saveAfterSignup(handle, nicho, objetivo, pendingResult)`:
  1. Chamar `supabase.functions.invoke("edrion-save-after-signup", { body })`
- Manter `analyzeMock` existente

---

## Etapa 7: Frontend - Modal de E-mail (Captura obrigatoria)

Criar `src/components/EmailCaptureModal.tsx`:

- Dialog/modal que aparece quando backend retorna `EMAIL_REQUIRED`
- Campos: email + senha (para criar conta Supabase Auth)
- Ao submeter:
  1. `supabase.auth.signUp({ email, password })`
  2. Chamar `saveAfterSignup()` com o resultado pendente
  3. Liberar o resultado na tela
- Sem e-mail = sem resultado (modal nao pode ser fechado)

---

## Etapa 8: Frontend - Upgrade Prompt

Criar `src/components/UpgradePrompt.tsx`:

- Tela para quando `FREE_LIMIT_REACHED`:
  - Headline: "Voce ja utilizou sua analise gratuita."
  - Subheadline: "Desbloqueie analise completa por R$19,90"
  - Botao CTA premium (placeholder por ora)
  - Botao "Voltar"

---

## Etapa 9: Atualizar `src/pages/Index.tsx`

- Importar `analyzeProfile` em vez de `analyzeMock`
- Novos estados: `showEmailModal`, `pendingResult`, `showUpgrade`, `handleTaken`
- Fluxo ao receber resposta:
  - `email_required` -> abrir modal de email com resultado pendente
  - `free_limit` -> mostrar UpgradePrompt
  - `handle_taken` -> toast "Esse perfil ja foi analisado por outro usuario"
  - sucesso -> mostrar resultado
- Mensagens de erro atualizadas no `ERROR_MESSAGES`

---

## Etapa 10: Atualizar `src/components/ResultView.tsx`

- Receber campo `plan` do resultado
- Se `plan === "free"`:
  - Mostrar bio_suggestion, top_post, worst_post normalmente
  - Na secao "Proximo Post" (agora bloqueada): exibir com blur + overlay "Desbloqueie com Premium - R$19,90"
- Se `plan === "premium"`:
  - Mostrar tudo (secoes extras quando existirem)

---

## Etapa 11: Loading Mais Lento

Modificar `src/components/LoadingOverlay.tsx`:

- Aumentar tick interval: `80ms` -> `150ms` (cada fase dura ~4.5s em vez de ~2.4s)
- Aumentar delay de transicao para resultado: `600ms` -> `2000ms` no `Index.tsx`
- A API real do Apify leva 8-15s, o loading vai preencher naturalmente

---

## Etapa 12: Auth Context (leve)

Criar `src/contexts/AuthContext.tsx`:

- Provider com `session`, `user`, `loading`
- `onAuthStateChange` listener (configurado ANTES de `getSession`)
- Exportar `useAuth` hook

Atualizar `src/App.tsx`:
- Envolver app com `AuthProvider`
- NAO proteger rota `/` (qualquer pessoa pode acessar o form)
- A autenticacao e solicitada apenas quando necessario (apos analise, via modal)

---

## Decisoes Arquiteturais

| Decisao | Escolha | Motivo |
|---------|---------|--------|
| Auth obrigatoria na home? | NAO | Usuario preenche form livremente, e-mail pedido so apos analise |
| Controle por handle | Indice unico em `analysis_result(handle)` | 1 analise por arroba no sistema todo |
| Plano decidido onde? | Backend (Edge Function) | Frontend apenas reage ao campo `plan` |
| Scraping sem auth | SIM, mas nao salva | Permite gerar resultado e pedir e-mail depois |
| Premium agora? | Estrutura pronta, sem pagamento | Botao CTA como placeholder |

---

## Arquivos Criados/Modificados

| Arquivo | Acao |
|---------|------|
| `supabase/functions/edrion-analyze/index.ts` | Criar |
| `supabase/functions/edrion-save-after-signup/index.ts` | Criar |
| `supabase/config.toml` | Editar |
| `src/types/analysis.ts` | Editar |
| `src/services/analyze.ts` | Editar |
| `src/contexts/AuthContext.tsx` | Criar |
| `src/components/EmailCaptureModal.tsx` | Criar |
| `src/components/UpgradePrompt.tsx` | Criar |
| `src/pages/Index.tsx` | Editar |
| `src/components/ResultView.tsx` | Editar |
| `src/components/LoadingOverlay.tsx` | Editar |
| `src/App.tsx` | Editar |

---

## Ordem de Implementacao

1. Secrets (APIFY_TOKEN, APIFY_ACTOR_ID)
2. Migration SQL (3 tabelas + trigger + indice)
3. Auth context (leve, sem proteger rotas)
4. Edge Functions (edrion-analyze + edrion-save-after-signup)
5. Types atualizados
6. Service layer atualizado
7. Componentes novos (EmailCaptureModal, UpgradePrompt)
8. Index.tsx + ResultView + LoadingOverlay ajustados

---

## Codigos de Retorno Padrao

| Codigo | Status HTTP | Significado |
|--------|-------------|-------------|
| `EMAIL_REQUIRED` | 401 | Analise feita mas e-mail obrigatorio para liberar |
| `FREE_LIMIT_REACHED` | 403 | Usuario FREE ja usou sua analise |
| `HANDLE_ALREADY_ANALYZED` | 409 | Handle ja analisado por outro usuario |
| `PRIVATE_PROFILE` | 403 | Perfil privado |
| `NOT_FOUND` | 404 | Perfil nao encontrado |
| `TIMEOUT` | 504 | Instagram instavel |
| `VALIDATION_ERROR` | 422 | Campos invalidos |

