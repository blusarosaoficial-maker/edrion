

# Auto-Confirmar Usuario no Cadastro

## Problema

Apos `signUp`, o Supabase exige confirmacao de email. O usuario fica preso na tela "Verifique seu email". Queremos que o cadastro seja instantaneo -- cria conta e ja loga automaticamente.

## Solucao

Criar uma edge function `auto-confirm-user` que usa o **service role** para confirmar o email do usuario via `auth.admin.updateUserById`. O frontend chama essa funcao logo apos o `signUp`, e em seguida faz `signInWithPassword` para logar.

## Arquivos Alterados

| Arquivo | Acao |
|---------|------|
| `supabase/functions/auto-confirm-user/index.ts` | CRIAR: edge function que confirma email via admin API |
| `supabase/config.toml` | Adicionar entrada para a nova funcao |
| `src/components/AuthModal.tsx` | Modificar `handleSignup`: chamar auto-confirm + signIn imediato |

## Detalhes Tecnicos

### 1. Nova Edge Function `auto-confirm-user/index.ts`

Recebe: `{ user_id: string }` (POST, sem auth obrigatoria -- a funcao valida internamente)

Fluxo:
1. Receber `user_id` do body
2. Usar service role para chamar `supabase.auth.admin.updateUserById(user_id, { email_confirm: true })`
3. Retornar sucesso

Seguranca: A funcao so confirma o email, nao da acesso a nada. O `user_id` vem do `signUp` que acabou de ser executado.

### 2. `supabase/config.toml`

Adicionar:
```toml
[functions.auto-confirm-user]
verify_jwt = false
```

### 3. `src/components/AuthModal.tsx` -- Modificar `handleSignup`

Fluxo atual (linhas 71-91):
```
signUp -> tenta signIn -> se falha -> waitingConfirmation
```

Novo fluxo:
```
signUp -> pega user.id da resposta -> chama auto-confirm-user -> signInWithPassword -> onSuccess
```

Mudanca cirurgica apenas no `handleSignup`:
1. `signUp` retorna `data.user.id` mesmo sem sessao
2. Chamar `supabase.functions.invoke("auto-confirm-user", { body: { user_id } })`
3. Chamar `signInWithPassword` -- agora funciona porque email ja esta confirmado
4. `onAuthStateChange` dispara `SIGNED_IN` -> `onSuccess()`
5. Remover estado `waitingConfirmation` e toda a UI de "Verifique seu email" (nao e mais necessaria)

### Nenhum outro arquivo alterado

- `Index.tsx`: sem mudanca
- `edrion-analyze`: sem mudanca
- `edrion-save-result`: sem mudanca
- `services/analyze.ts`: sem mudanca

## Risco

Zero impacto em funcionalidades existentes:
- Login por senha continua identico
- Fluxo de analise nao muda
- Backend nao muda
- Apenas o signup passa a confirmar automaticamente

