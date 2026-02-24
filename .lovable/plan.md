

# Corrigir erro de build e fazer deploy da edge function

## Situacao

A regra 10 anti-alucinacao ja esta sincronizada no codigo. Porem, ha um erro de TypeScript que impede o deploy:

```text
TS2322: Type 'SupabaseClient<any, "public", any>' is not assignable to
type 'SupabaseClient<unknown, never, GenericSchema>'
```

O problema esta na interface `AuthResult` (linha 765): `ReturnType<typeof createClient>` resolve para um tipo generico incompativel com o retorno real de `createClient(url, key)`.

## Mudanca

### Arquivo: `supabase/functions/edrion-analyze/index.ts`

**Linha 765**: Trocar o tipo restritivo por `any` para eliminar o erro de compatibilidade:

```
// De:
supabaseAdmin: ReturnType<typeof createClient>;

// Para:
supabaseAdmin: any;
```

### Deploy

Fazer redeploy da edge function `edrion-analyze` apos a correcao.

