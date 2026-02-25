

# Redeploy edrion-analyze + Criar bucket post-thumbnails

## O que sera feito

### 1. Criar bucket publico `post-thumbnails` no Supabase Storage
- Bucket publico (mesmo padrao do `avatars` existente)
- Necessario para que a funcao `proxyPostThumbnail` consiga salvar e servir as thumbnails dos posts via URL publica do Supabase Storage
- SQL migration para criar o bucket e configurar RLS

### 2. Redeploy da edge function `edrion-analyze`
- O codigo ja esta sincronizado do GitHub com todas as correcoes:
  - Anti-alucinacao na bio (regra 10 no system prompt)
  - Proxy de thumbnails via `proxyPostThumbnail()` + bucket `post-thumbnails`
  - Fallback melhorado no modal (mensagem amigavel quando IA indisponivel)
  - UX dos cards de post (hover, score badge, tier badge)
  - Legenda completa (`full_caption`) nos dados do post

## Detalhes tecnicos

### Migration SQL
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-thumbnails', 'post-thumbnails', true);

-- Permitir leitura publica (objetos publicos)
CREATE POLICY "Public read post-thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-thumbnails');

-- Permitir service role fazer upload (edge function usa service role key)
CREATE POLICY "Service role upload post-thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'post-thumbnails');

CREATE POLICY "Service role delete post-thumbnails"
ON storage.objects FOR DELETE
USING (bucket_id = 'post-thumbnails');
```

### Deploy
- Redeploy da funcao `edrion-analyze`

### Nenhuma alteracao de codigo
- Todos os arquivos frontend e backend ja estao sincronizados do GitHub
