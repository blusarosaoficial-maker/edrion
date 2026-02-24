

# Aplicar alteracoes do GitHub e fazer deploy

## Mudancas no arquivo `supabase/functions/edrion-analyze/index.ts`

1. **Linha 555**: Trocar `15000` por `45000` (timeout de 15s para 45s)
2. **Linha 566**: Trocar `"gpt-4o-mini"` por `"gpt-4o"` (modelo mais capaz)

## Deploy

Fazer redeploy da edge function `edrion-analyze` imediatamente apos as alteracoes.

