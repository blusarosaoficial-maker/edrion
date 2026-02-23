
-- Tabela users_profiles
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

-- Trigger auto-criar perfil no signup
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

-- Tabela analysis_request
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

-- Tabela analysis_result
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
