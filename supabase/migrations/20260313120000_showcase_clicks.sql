-- Tabela para trackear cliques nos cards do showcase
-- Usado para entender quais perfis/nichos atraem mais interesse
CREATE TABLE public.showcase_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT NOT NULL,
  niche TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.showcase_clicks ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode inserir (inclusive anon)
CREATE POLICY "Anyone can insert showcase clicks" ON public.showcase_clicks
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Apenas service_role pode ler (para admin dashboard futuro)
CREATE POLICY "Service reads showcase clicks" ON public.showcase_clicks
  FOR SELECT TO service_role USING (true);

-- Indice para queries de analytics por handle e niche
CREATE INDEX idx_showcase_clicks_handle ON public.showcase_clicks(handle);
CREATE INDEX idx_showcase_clicks_niche ON public.showcase_clicks(niche);
CREATE INDEX idx_showcase_clicks_created ON public.showcase_clicks(created_at DESC);
