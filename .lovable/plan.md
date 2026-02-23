

# Melhorias no LoadingOverlay: Foto Real + CountUp Mais Lento

## Problema 1: Foto do perfil nao aparece

A URL do avatar vem direto do CDN do Instagram (`scontent-*.cdninstagram.com`). Essas URLs tem tokens temporarios e frequentemente sao bloqueadas pelo navegador quando carregadas cross-origin via `new Image()`. O preload falha silenciosamente, `avatarLoaded` nunca fica `true`, e o icone do Instagram nunca troca para a foto real.

### Solucao: Proxy via Supabase Storage

Salvar o avatar no Supabase Storage durante o scraping na edge function. Assim:
- URL nao expira
- Sem problemas de CORS
- Foto disponivel para exibicao futura

**Passos:**

1. **Criar bucket `avatars` no Supabase Storage** (publico, via migration SQL)

2. **Modificar `supabase/functions/edrion-analyze/index.ts`**: Apos o scraping do Apify, baixar a imagem do avatar e fazer upload para o bucket `avatars` com o nome `{handle}.jpg`. Substituir o `avatar_url` no resultado pela URL publica do Storage. Isso acontece DENTRO da funcao `normalizeProfile` ou logo apos, sem alterar a estrutura existente.

3. **Nenhuma mudanca no frontend** -- o `LoadingOverlay` ja faz preload via `new Image()` e transiciona para a foto. Com uma URL do Supabase Storage (mesmo dominio, sem CORS), o preload vai funcionar normalmente.

## Problema 2: CountUp muito rapido

Atualmente usa 3000ms. Aumentar para 5000ms para dar mais dramaticidade a animacao dos numeros.

### Arquivo: `src/hooks/useCountUp.ts`
- Mudar default de `duration` de 3000 para 5000

### Arquivo: `src/components/LoadingOverlay.tsx`
- Atualizar a chamada do `CountUpNumber` para usar 5000ms explicitamente (opcional, ja que o default muda)

## Detalhes Tecnicos

### Migration SQL (novo bucket):
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

CREATE POLICY "Public read avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Service insert avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');
```

### Edge function (`edrion-analyze/index.ts`):
Adicionar funcao `proxyAvatar(handle, originalUrl, supabaseAdmin)`:
- Faz `fetch(originalUrl)` para baixar a imagem
- Faz upload para `avatars/{handle}.jpg` via `supabaseAdmin.storage.from('avatars').upload()`
- Retorna a URL publica: `{SUPABASE_URL}/storage/v1/object/public/avatars/{handle}.jpg`
- Em caso de erro no proxy, retorna a URL original (fallback seguro)

Chamada apos `normalizeProfile()`, substituindo `profile.avatar_url` pela URL do Storage.

### Arquivos impactados:
- `supabase/functions/edrion-analyze/index.ts` -- adicionar proxy de avatar (sem alterar fluxo existente)
- `src/hooks/useCountUp.ts` -- aumentar duration default
- Migration SQL para criar bucket

### Sem impacto em:
- `LoadingOverlay.tsx` (ja funciona, so precisa de URL valida)
- `Index.tsx` (sem mudancas)
- Nenhuma outra funcionalidade existente

